┌─────────────────────────────────────────────────────────────────────────┐
│   Elasticsearch  ──►  Stage-1 Aho-Corasick  ──►  Stage-2 Regex          │
│   (polling /            (O(log_len) trie)         (batch-compiled)      │
│    scroll /                    │                        │               │
│    streaming)                  └────────────────────────┘               │
│                                          │                              │
│                                  Stage-3 Embedding                      │
│                              (SecureBERT / MiniLM)                      │
│                                          │                              │
│                           Temporal Correlation Window                   │
│                          (cross-DC boost on same asset)                 │
│                                          │                              │
│                              Deduplication / Cursor                     │
│                                          │                              │
│                    ┌─────────────────────┼─────────────────────┐        │
│                  stdout              file sink             Kafka/HTTP   │
└─────────────────────────────────────────────────────────────────────────┘



final_score = 0.20 × stage1_score + 0.45 × stage2_score  + 0.35 × stage3_score