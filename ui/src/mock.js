export const MOCK_VERIFY = {
  "fake": {
    "claim": "Drinking hot water cures cancer",
    "verdict": "FAKE",
    "trust_score": 0.872,
    "sub_claims": [
      {
        "sub_claim": "Drinking hot water cures cancer",
        "label": "FAKE",
        "confidence": 0.9867,
        "trust_score": 0.872,
        "contradicted": false,
        "attention_top": [
          [
            "water",
            0.1977
          ],
          [
            "hot",
            0.1793
          ],
          [
            "cures",
            0.1758
          ],
          [
            "cancer",
            0.1753
          ],
          [
            "Drinking",
            0.1638
          ]
        ],
        "attention_all": [
          [
            "Drinking",
            0.1638
          ],
          [
            "hot",
            0.1793
          ],
          [
            "water",
            0.1977
          ],
          [
            "cures",
            0.1758
          ],
          [
            "cancer",
            0.1753
          ]
        ],
        "evidence": [
          {
            "similarity": 0.7494,
            "matched_claim": "Says cutting out sugar and drinking hot lemon water will cure cancer.",
            "verdict": "FAKE",
            "justification": "A post going around the internet is offering  cancer remedies. Its citations come up short and experts say that the dubious medical advice is inconsistent with scientific . We rate it ."
          },
          {
            "similarity": 0.5291,
            "matched_claim": "Boiling tap water causes fluoride in the water to be \"more toxic.",
            "verdict": "FAKE",
            "justification": "Fluoridation expert Howard Pollick, a dentistry professor at the University of California, San Francisco, said water companies sometimes recommend boiling when the water supply is contaminated.   Lilly D’Angelo, president and founder of Global Food and Beverage Technology Associates consulting compa"
          },
          {
            "similarity": 0.516,
            "matched_claim": "Slices of lemon in a cup of hot water can save your life. The hot lemon can kill the proliferation of\" the novel coronavirus.",
            "verdict": "FAKE",
            "justification": "As of now, there is no specific treatment for COVID-19. But according to the Mayo Clinic, patients can alleviate symptoms — including cough, shortness of breath and fever — with cough medicine, pain and fever relievers, rest, and fluids. The chain message is . We rate it . If you receive a chain mes"
          }
        ]
      }
    ]
  },
  "unverified": {
    "claim": "The government announced a new tax policy yesterday",
    "verdict": "UNVERIFIED",
    "trust_score": 0.3168,
    "sub_claims": [
      {
        "sub_claim": "The government announced a new tax policy yesterday",
        "label": "FAKE",
        "confidence": 0.9051,
        "trust_score": 0.3168,
        "contradicted": false,
        "attention_top": [
          [
            "new",
            0.1377
          ],
          [
            "government",
            0.1272
          ],
          [
            "tax",
            0.1196
          ],
          [
            "policy",
            0.1149
          ],
          [
            "The",
            0.1092
          ]
        ],
        "attention_all": [
          [
            "The",
            0.1092
          ],
          [
            "government",
            0.1272
          ],
          [
            "announced",
            0.0946
          ],
          [
            "a",
            0.097
          ],
          [
            "new",
            0.1377
          ],
          [
            "tax",
            0.1196
          ],
          [
            "policy",
            0.1149
          ],
          [
            "yesterday",
            0.0833
          ]
        ],
        "evidence": [
          {
            "similarity": 0.5957,
            "matched_claim": "Says the federal government is earning more tax revenue now \"than any other time.",
            "verdict": "FAKE",
            "justification": "McCarthy told Fox News, \"There's more money going in than any other time. In the last four decades, on average, we brought in 17.9 percent of GDP. Now we're going to bring in 19.1.\" Starting in 2015, reputable projections show revenue rising to 19.1 percent of GDP, up from an average of 17.9 over th"
          },
          {
            "similarity": 0.5877,
            "matched_claim": "The Americans for Tax Reform pledge \"relates to new taxes that were going to be initiated by legislative action.",
            "verdict": "FAKE",
            "justification": "\"By vocally supporting T-SPLOST, he certainly isn’t holding up the first half of his commitment.\" ATR knows the meaning of the pledge better than anyone. It says Deal is  about his interpretation. We agree. Our rating: ."
          },
          {
            "similarity": 0.5833,
            "matched_claim": "The new tax law is \"kicking the American economy into high gear with $5.5 trillion in tax cuts.",
            "verdict": "FAKE",
            "justification": "Trump said the recently enacted tax law includes \"$5.5 trillion in tax cuts.\" Putting it that way ignores that the bill also includes $4 trillion in tax increases, for a net of $1.5 trillion in tax cuts. The statement contains an element of  but ignores critical facts that would give a different imp"
          }
        ]
      }
    ]
  },
  "compound": {
    "claim": "Drinking hot water cures cancer and boosts your immune system",
    "verdict": "FAKE",
    "trust_score": 0.872,
    "sub_claims": [
      {
        "sub_claim": "Drinking hot water cures cancer",
        "label": "FAKE",
        "confidence": 0.9867,
        "trust_score": 0.872,
        "contradicted": false,
        "attention_top": [
          [
            "water",
            0.1977
          ],
          [
            "hot",
            0.1793
          ],
          [
            "cures",
            0.1758
          ],
          [
            "cancer",
            0.1753
          ],
          [
            "Drinking",
            0.1638
          ]
        ],
        "attention_all": [
          [
            "Drinking",
            0.1638
          ],
          [
            "hot",
            0.1793
          ],
          [
            "water",
            0.1977
          ],
          [
            "cures",
            0.1758
          ],
          [
            "cancer",
            0.1753
          ]
        ],
        "evidence": [
          {
            "similarity": 0.7494,
            "matched_claim": "Says cutting out sugar and drinking hot lemon water will cure cancer.",
            "verdict": "FAKE",
            "justification": "A post going around the internet is offering  cancer remedies. Its citations come up short and experts say that the dubious medical advice is inconsistent with scientific . We rate it ."
          },
          {
            "similarity": 0.5291,
            "matched_claim": "Boiling tap water causes fluoride in the water to be \"more toxic.",
            "verdict": "FAKE",
            "justification": "Fluoridation expert Howard Pollick, a dentistry professor at the University of California, San Francisco, said water companies sometimes recommend boiling when the water supply is contaminated.   Lilly D’Angelo, president and founder of Global Food and Beverage Technology Associates consulting compa"
          },
          {
            "similarity": 0.516,
            "matched_claim": "Slices of lemon in a cup of hot water can save your life. The hot lemon can kill the proliferation of\" the novel coronavirus.",
            "verdict": "FAKE",
            "justification": "As of now, there is no specific treatment for COVID-19. But according to the Mayo Clinic, patients can alleviate symptoms — including cough, shortness of breath and fever — with cough medicine, pain and fever relievers, rest, and fluids. The chain message is . We rate it . If you receive a chain mes"
          }
        ]
      },
      {
        "sub_claim": "boosts your immune system",
        "label": "REAL",
        "confidence": 0.9933,
        "trust_score": 0.3477,
        "contradicted": false,
        "attention_top": [
          [
            "system",
            0.2786
          ],
          [
            "immune",
            0.2739
          ],
          [
            "boosts",
            0.177
          ],
          [
            "your",
            0.1436
          ]
        ],
        "attention_all": [
          [
            "boosts",
            0.177
          ],
          [
            "your",
            0.1436
          ],
          [
            "immune",
            0.2739
          ],
          [
            "system",
            0.2786
          ]
        ],
        "evidence": [
          {
            "similarity": 0.5912,
            "matched_claim": "Dolores Cahill in Computing Forever interview claims that taking vitamins C and D as well as zinc boosts the immune system against COVID-19 that hydroxychloroquine has been proven effective against COVID-19 and that COVID-19 patients who recover are immune for life among others.",
            "verdict": "FAKE",
            "justification": "Fact-checked COVID-19 health claim (CoAID dataset)."
          },
          {
            "similarity": 0.581,
            "matched_claim": "The COVID-19 vaccines \"suppress the immune system\" and make people more susceptible to HIV, shingles and herpes.",
            "verdict": "FAKE",
            "justification": "A doctor claimed getting vaccinated against COVID-19 would weaken a person’s immune system and make them more susceptible to other illnesses. Studies into the efficacy of the vaccines have found that they actually strengthen a person’s immunity. There has been no  that links a weakened immune system"
          },
          {
            "similarity": 0.5488,
            "matched_claim": "The immune system does not exist.",
            "verdict": "FAKE",
            "justification": "According to Cleveland Clinic, the lymphatic system is part of the immune system. It’s a network of tissues, vessels and organs that move a fluid called lymph through the human bloodstream and protects the human body from illness-causing invaders, such as bacteria, parasites and viruses.   The Child"
          }
        ]
      }
    ]
  },
  "contradicted": {
    "claim": "Garlic prevents COVID-19 infection",
    "verdict": "UNVERIFIED",
    "trust_score": 0.349,
    "sub_claims": [
      {
        "sub_claim": "Garlic prevents COVID-19 infection",
        "label": "REAL",
        "confidence": 0.9971,
        "trust_score": 0.349,
        "contradicted": true,
        "attention_top": [
          [
            "19",
            0.1792
          ],
          [
            "VID",
            0.1696
          ],
          [
            "CO",
            0.1665
          ],
          [
            "Garlic",
            0.1189
          ],
          [
            "infection",
            0.1177
          ]
        ],
        "attention_all": [
          [
            "Garlic",
            0.1189
          ],
          [
            "prevents",
            0.116
          ],
          [
            "CO",
            0.1665
          ],
          [
            "VID",
            0.1696
          ],
          [
            "-",
            0.0811
          ],
          [
            "19",
            0.1792
          ],
          [
            "infection",
            0.1177
          ]
        ],
        "evidence": [
          {
            "similarity": 0.6626,
            "matched_claim": "Freshly boiled garlic water is a cure for coronavirus.",
            "verdict": "FAKE",
            "justification": "Fact-checked COVID-19 health claim (CoAID dataset)."
          },
          {
            "similarity": 0.6245,
            "matched_claim": "The new coronavirus can be cured by drinking one bowl of freshly boiled garlic water.",
            "verdict": "FAKE",
            "justification": "Fact-checked COVID-19 health claim (CoAID dataset)."
          },
          {
            "similarity": 0.6004,
            "matched_claim": "Lemon juice and bicarbonate mixture prevents and cures COVID-19 in Israel.",
            "verdict": "FAKE",
            "justification": "Fact-checked COVID-19 health claim (CoAID dataset)."
          }
        ]
      }
    ]
  }
};
