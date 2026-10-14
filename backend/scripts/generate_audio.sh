#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v espeak >/dev/null 2>&1 || { echo "Install espeak to generate sample speech audio."; exit 1; }
espeak -v en+f3 -s 145 -w media/call-001.wav "Thanks for calling BrightDesk. How can I help? I really like the product demo. The premium plan has the integrations we need. Could you explain the annual price? It is twenty four thousand rupees per year, with onboarding included. That sounds reasonable. If you send me the proposal today, I can review it with my manager and hopefully start next week."
espeak -v en+m3 -s 145 -w media/call-002.wav "What are you looking for in a customer support platform? We are evaluating a few options. Yours looks okay, but another vendor offers similar features. I need to compare integrations and total cost before deciding. Would a product walkthrough help? Maybe. Please email the feature list and pricing. We probably will not decide this week."
espeak -v en+m2 -s 138 -w media/call-003.wav "I can help you choose a plan. Honestly, the price is too expensive for us. We tried the trial and it was confusing, and nobody explained the setup properly. I am not convinced it is worth paying for. I am sorry the onboarding was frustrating. We can arrange a guided session. I do not want to commit right now. Please do not call me again this week."
espeak -v en+f4 -s 148 -w media/call-004.wav "I saw your request for a subscription. Yes, the product fits what our team needs. Can we pay by invoice, and how soon can onboarding begin? We can issue an invoice and usually onboard within two business days. Perfect. Please send the invoice and agreement today. I have approval from my department and would like to start on Monday."
echo "Generated four synthetic WAV files in backend/media/"
