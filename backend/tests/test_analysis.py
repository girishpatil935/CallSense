import unittest

from app.main import CALLS, analyze_text, phrase_count


class AnalysisTests(unittest.TestCase):
    def test_phrase_matching_uses_word_boundaries(self):
        self.assertEqual(phrase_count("greatness is great", "great"), 1)
        self.assertEqual(phrase_count("not convinced; convinced", "not convinced"), 1)

    def test_synthetic_calls_have_three_way_sentiment_and_complete_analysis(self):
        analyses = [analyze_text(call["transcript"]) for call in CALLS]
        self.assertEqual([a.sentiment for a in analyses], ["Positive", "Neutral", "Negative", "Positive"])
        for analysis in analyses:
            self.assertEqual(set(analysis.sentiment_scores), {"Positive", "Neutral", "Negative"})
            self.assertTrue(0 <= analysis.purchase_probability <= 100)
            self.assertTrue(analysis.key_insights)
            self.assertTrue(analysis.behavioral_signals)
            self.assertTrue(analysis.recommended_action)


if __name__ == "__main__":
    unittest.main()
