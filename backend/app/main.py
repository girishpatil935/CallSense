from __future__ import annotations
import os, re, json
from pathlib import Path
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "media"
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)

app = FastAPI(title="CallSense AI API", version="1.0.0", description="Synthetic customer-call analytics demo API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"], expose_headers=["Content-Disposition"])

class Analysis(BaseModel):
    sentiment: Literal['Positive','Neutral','Negative']
    sentiment_scores: dict[str, float]
    purchase_probability: int = Field(ge=0, le=100)
    confidence_note: str
    key_insights: list[str]
    behavioral_signals: list[str]
    recommended_action: str
    analyzed_at: str
    analysis_method: str

CALLS = [
 {"id":"CALL-001","customer":"Priya Sharma","title":"Premium plan inquiry","date":"2026-10-14","duration":"02:18","channel":"Inbound sales","transcript":"Agent: Thanks for calling BrightDesk. How can I help? Customer: I really like the product demo. The premium plan has the integrations we need. Could you explain the annual price? Agent: It is ₹24,000 per year, with onboarding included. Customer: That sounds reasonable. If you send me the proposal today, I can review it with my manager and hopefully start next week.","audio":"call-001.wav","expected_scenario":"Interested in premium features; asks price and requests proposal."},
 {"id":"CALL-002","customer":"Rahul Mehta","title":"Comparing alternatives","date":"2026-10-14","duration":"03:04","channel":"Inbound sales","transcript":"Agent: What are you looking for in a customer support platform? Customer: We are evaluating a few options. Yours looks okay, but another vendor offers similar features. I need to compare integrations and total cost before deciding. Agent: Would a product walkthrough help? Customer: Maybe. Please email the feature list and pricing. We probably will not decide this week.","audio":"call-002.wav","expected_scenario":"Interested but comparing competitors and delaying decision."},
 {"id":"CALL-003","customer":"Amit Desai","title":"Pricing objection","date":"2026-10-14","duration":"02:42","channel":"Support-to-sales","transcript":"Agent: I can help you choose a plan. Customer: Honestly, the price is too expensive for us. We tried the trial and it was confusing, and nobody explained the setup properly. I am not convinced it is worth paying for. Agent: I am sorry the onboarding was frustrating. We can arrange a guided session. Customer: I do not want to commit right now. Please do not call me again this week.","audio":"call-003.wav","expected_scenario":"Negative experience, price objection, and explicit delay."},
 {"id":"CALL-004","customer":"Neha Kulkarni","title":"Ready to get started","date":"2026-10-14","duration":"01:56","channel":"Inbound sales","transcript":"Agent: I saw your request for a subscription. Customer: Yes, the product fits what our team needs. Can we pay by invoice, and how soon can onboarding begin? Agent: We can issue an invoice and usually onboard within two business days. Customer: Perfect. Please send the invoice and agreement today. I have approval from my department and would like to start on Monday.","audio":"call-004.wav","expected_scenario":"Clear product fit, payment and onboarding questions, urgency, and approval."}
]

# Lightweight fallback signals. This is a transparent prototype, not a production-trained model.
POSITIVE = {'love','like','great','perfect','reasonable','helpful','excellent','fits','interested','start','approval','ready','good','thank'}
NEGATIVE = {'expensive','confusing','frustrating','frustrated','not convinced','not worth','problem','bad','disappointed','do not call','unhappy','difficult'}
BUYING = {'buy','purchase','subscribe','subscription','invoice','payment','pay','start','onboarding','proposal','agreement','approval','order','pricing','price','next week','monday','get started'}
OBJECTIONS = {'expensive','too much','confusing','not convinced','not commit','not decide','do not call','delay','frustrating'}

def phrase_count(text: str, phrase: str) -> int:
    """Count whole words/phrases so a signal cannot match inside another word."""
    return len(re.findall(rf"(?<!\w){re.escape(phrase)}(?!\w)", text, flags=re.IGNORECASE))

def signal_count(text: str, phrases: set[str]) -> int:
    return sum(phrase_count(text, phrase) for phrase in phrases)

_transformer = None
_transformer_status = 'fallback'
def get_transformer():
    global _transformer, _transformer_status
    if os.getenv('ENABLE_TRANSFORMERS','false').lower() != 'true':
        return None
    if _transformer is not None: return _transformer
    try:
        from transformers import pipeline
        # Uses a locally cached model only; no download is triggered by this app.
        model_path = os.getenv('SENTIMENT_MODEL_PATH', 'distilbert-base-uncased-finetuned-sst-2-english')
        _transformer = pipeline('sentiment-analysis', model=model_path, tokenizer=model_path, local_files_only=True)
        _transformer_status = 'local_transformer'
        return _transformer
    except Exception:
        _transformer_status = 'fallback'
        return None

def analyze_text(text: str) -> Analysis:
    clean = text.lower()
    pos_hits = signal_count(clean, POSITIVE)
    neg_hits = signal_count(clean, NEGATIVE)
    # Use a locally cached transformer if explicitly enabled and available.
    pipe = get_transformer()
    method = 'Transparent lexical fallback + purchase-signal scoring'
    if pipe:
        try:
            # SST-2 is binary, so neutral is still estimated using signal balance.
            result = pipe(text[:1800])[0]
            label = result['label'].upper()
            strength = float(result['score'])
            if label == 'POSITIVE': pos_hits += 2 if strength >= .7 else 1
            else: neg_hits += 2 if strength >= .7 else 1
            method = 'Locally cached DistilBERT sentiment + purchase-signal scoring'
        except Exception:
            pass
    total = pos_hits + neg_hits
    if total == 0 or abs(pos_hits-neg_hits) <= 1:
        sentiment = 'Neutral'
    elif pos_hits > neg_hits:
        sentiment = 'Positive'
    else:
        sentiment = 'Negative'
    # These are indicative class scores, not calibrated model probabilities.
    raw = {'Positive': pos_hits + 1, 'Neutral': max(1, 2-abs(pos_hits-neg_hits)), 'Negative': neg_hits + 1}
    denom = sum(raw.values())
    scores = {k: round(v/denom, 3) for k,v in raw.items()}

    # Explainable intent feature extraction; all weights are prototype heuristics.
    feature_weights = {
      'purchase_intent': (signal_count(clean, {'want to start','get started','would like to start','ready to','please send the invoice','send me the proposal','send the invoice'}), 10),
      'payment_or_contract': (signal_count(clean, {'invoice','pay by','payment','agreement'}), 5),
      'product_fit': (signal_count(clean, {'fits','need','integrations we need','product fits'}), 7),
      'urgency_or_approval': (signal_count(clean, {'today','monday','next week','approval','approved'}), 5),
      'objections': (signal_count(clean, OBJECTIONS), -8),
      'competitor_comparison': (signal_count(clean, {'competitor','another vendor','compare','comparing'}), -7),
    }
    score = 42
    positive_signals=[]; negative_signals=[]
    for feature,(count,weight) in feature_weights.items():
        if count:
            contribution = min(count * abs(weight), 18)
            score += contribution if weight > 0 else -contribution
            if weight > 0:
                positive_signals.append(feature.replace('_',' ').capitalize())
            else:
                negative_signals.append(feature.replace('_',' ').capitalize())
    if sentiment == 'Positive': score += 7
    elif sentiment == 'Negative': score -= 10
    probability = max(5, min(96, int(round(score))))

    insights=[]
    if sentiment == 'Positive': insights.append('Customer language is broadly favorable; preserve momentum with a clear next step.')
    elif sentiment == 'Negative': insights.append('Customer expressed dissatisfaction or resistance; acknowledge the concern before selling further.')
    else: insights.append('Customer is still evaluating; provide relevant information and clarify decision criteria.')
    if signal_count(clean, {'price','expensive','cost'}): insights.append('Pricing or total cost is part of the conversation; make plan value and inclusions explicit.')
    if signal_count(clean, {'invoice','payment','agreement','onboarding'}): insights.append('Customer asked about purchase logistics, which can indicate movement toward a decision.')
    if signal_count(clean, {'competitor','compare','another vendor'}): insights.append('Customer is comparing alternatives; differentiate on the requirements they care about.')
    if signal_count(clean, {'today','monday','next week','approval','approved'}): insights.append('A time-bound next step or approval signal appears in the transcript.')
    behavior=[]
    if positive_signals: behavior.append('Positive intent signals: ' + ', '.join(positive_signals) + '.')
    if negative_signals: behavior.append('Risk signals: ' + ', '.join(negative_signals) + '.')
    if not behavior: behavior.append('No strong explicit buying or objection phrase was detected by the prototype rules.')
    if probability >= 75: action='Prioritize follow-up promptly; send the requested commercial documents and confirm the next step.'
    elif probability >= 50: action='Send tailored information, address open questions, and schedule a low-pressure follow-up.'
    else: action='Resolve the primary objection first; respect stated contact preferences and avoid aggressive follow-up.'
    return Analysis(sentiment=sentiment, sentiment_scores=scores, purchase_probability=probability,
      confidence_note='Prototype estimate from synthetic demo calls. Purchase percentages are heuristic, not calibrated real-world probabilities.',
      key_insights=insights, behavioral_signals=behavior, recommended_action=action,
      analyzed_at=datetime.now(timezone.utc).isoformat(), analysis_method=method)

def public_call(call):
    return {k:v for k,v in call.items() if k != 'expected_scenario'}

@app.get('/')
def root(): return {'name':'CallSense AI API','version':'1.0.0','docs':'/docs','status':'ok'}
@app.get('/api/health')
def health(): return {'status':'ok','sentiment_engine':_transformer_status,'transformer_enabled':os.getenv('ENABLE_TRANSFORMERS','false').lower()=='true'}
@app.get('/api/calls')
def list_calls():
    items=[]
    for call in CALLS:
        a=analyze_text(call['transcript'])
        items.append({**public_call(call), 'analysis':a.model_dump()})
    return {'calls':items,'count':len(items),'demo_data':True}
@app.get('/api/calls/{call_id}')
def call_detail(call_id: str):
    call=next((c for c in CALLS if c['id']==call_id),None)
    if not call: raise HTTPException(404,'Call not found')
    return {**public_call(call),'analysis':analyze_text(call['transcript']).model_dump(),'demo_data':True}
@app.get('/api/calls/{call_id}/audio')
def call_audio(call_id: str):
    call=next((c for c in CALLS if c['id']==call_id),None)
    if not call: raise HTTPException(404,'Call not found')
    path=MEDIA/call['audio']
    if not path.exists(): raise HTTPException(404,'Audio file not found. Re-run scripts/generate_audio.sh.')
    return FileResponse(path,media_type='audio/wav',filename=call['audio'])

@app.get('/api/calls/{call_id}/report')
def download_report(call_id: str):
    call=next((c for c in CALLS if c['id']==call_id),None)
    if not call: raise HTTPException(404,'Call not found')
    analysis=analyze_text(call['transcript'])
    path=REPORTS/f'{call_id.lower()}-analysis.pdf'
    styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name='SmallBody',parent=styles['BodyText'],fontSize=9,leading=13,spaceAfter=6))
    styles.add(ParagraphStyle(name='Section',parent=styles['Heading2'],textColor=colors.HexColor('#4338ca'),spaceBefore=12,spaceAfter=6))
    doc=SimpleDocTemplate(str(path),pagesize=letter,rightMargin=.65*inch,leftMargin=.65*inch,topMargin=.6*inch,bottomMargin=.6*inch)
    story=[Paragraph('CallSense AI',styles['Title']),Paragraph('Customer Call Analysis Report',styles['Heading2']),Paragraph('Synthetic demo data — use as a prototype, not a validated sales forecast.',styles['Italic']),Spacer(1,12)]
    rows=[["Call ID",call['id']],["Customer",call['customer']],["Call type",call['title']],["Date",call['date']],["Duration",call['duration']],["Sentiment",analysis.sentiment],["Estimated purchase intent (heuristic score)",f"{analysis.purchase_probability}%"]]
    table=Table(rows,colWidths=[2.0*inch,4.8*inch],hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(0,-1),colors.HexColor('#eef2ff')),('TEXTCOLOR',(0,0),(0,-1),colors.HexColor('#312e81')),('FONTNAME',(0,0),(-1,-1),'Helvetica'),('FONTSIZE',(0,0),(-1,-1),9),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#d1d5db')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    story += [table,Paragraph('Analysis method',styles['Section']),Paragraph(analysis.analysis_method,styles['SmallBody']),Paragraph(analysis.confidence_note,styles['SmallBody']),Paragraph('Sentiment class scores',styles['Section'])]
    story.append(Paragraph(' | '.join(f'{k}: {v:.1%}' for k,v in analysis.sentiment_scores.items()),styles['SmallBody']))
    story.append(Paragraph('Key insights',styles['Section']))
    story.extend(Paragraph('• '+x,styles['SmallBody']) for x in analysis.key_insights)
    story.append(Paragraph('Behavioral signals',styles['Section']))
    story.extend(Paragraph('• '+x,styles['SmallBody']) for x in analysis.behavioral_signals)
    story += [Paragraph('Recommended next action',styles['Section']),Paragraph(analysis.recommended_action,styles['SmallBody']),Paragraph('Conversation transcript',styles['Section']),Paragraph(call['transcript'].replace('&','&amp;').replace('<','&lt;').replace('>','&gt;'),styles['SmallBody']),Spacer(1,12),Paragraph('Generated at '+analysis.analyzed_at,styles['Italic'])]
    doc.build(story)
    return FileResponse(path,media_type='application/pdf',filename=f'{call_id.lower()}-analysis-report.pdf')
