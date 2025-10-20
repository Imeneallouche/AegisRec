# 1. Structure of the Recommender System

**A hybrid stack made of three tightly integrated layers:**

1. **Knowledge-based core / Knowledge Graph (KG) + rule engine** — authoritative mapping to MITRE ATT&CK for ICS, explicit constraints and safe fallbacks (required for safety-critical ICS environments). (Use MITRE ATT&CK artifacts as canonical knowledge). ([MITRE ATT&CK][1])
2. **Graph-based candidate generator (GNN / LightGCN or a simplified LightGNN variant)** — learns from cross-site interaction patterns, propagates risk signals across the asset–technique–control graph to surface likely relevant detection & mitigation candidates. LightGCN and similar GNNs are effective and efficient for recommendation on interaction graphs. ([arXiv][2])
3. **Retrieval-augmented generative layer (RAG + LLM) + supervised ranker** — RAG over the KG + historical cases + MITRE docs to produce actionable, machine-readable recommendation text; then use a supervised scorer (e.g., LightGBM / XGBoost or a small neural ranker) to produce priority and calibrated confidence. Use RAG to avoid hallucination and provide provenance. (Generative AI can assist but must be grounded & audited). ([ScienceDirect][3])

We can optionally add an online **contextual bandit** or conservative **RL** layer later to adapt priorities over time, but only after offline validation and simulation (use Caldera for safe emulation). ([Caldera Documentation][4])

---

# 2. Why this blend?

* **ICS is safety-critical.** You must guarantee correctness, provenance and avoid hallucinated “mitigations.” A knowledge-based core (ATT&CK mapping + rules) gives interpretability and guarantees; it’s the **source of truth** for technique → detection/mitigation mappings. ([MITRE ATT&CK][1])
* **Graph methods** excel at propagating signals across structured relations (assets ↔ techniques ↔ mitigations ↔ observed events), and LightGCN-style models are proven effective for recommendation tasks on interaction graphs (accurate while being lightweight and scalable). ([arXiv][2])
* **Generative models** (LLMs) are excellent at producing clear, human-friendly and machine-readable text and for fusing multi-modal evidence — but they must be constrained by retrieval and KG grounding to avoid hallucination. Recent literature recommends retrieval-grounded GenAI for cybersecurity tasks. ([ScienceDirect][3])

---

# 3. Full architecture (modules & flow)

1. **Ingestion & Normalization**
   
   * Inputs: asset register (CSV/JSON), device configs, SIEM logs, Caldera / attack logs, MITRE ATT&CK ICS dataset.
   * Parsers: canonicalize asset IDs, normalize timestamps, extract structured fields (IPs, hostnames, device roles, PLC models, firmware versions).
   * Output: canonical event store + itemized records.
2. **Knowledge Layer (ATT&CK KG)**
   
   * Build a **Knowledge Graph** (Neo4j / Amazon Neptune) whose node types include: Asset, AssetType, ConfigItem, Vulnerability, Technique (MITRE TIDs), Mitigation, Detection, Control (existing protections), AttackInstance (with success/failure), Rule (SIEM/XDR).
   * Populate KG using: MITRE ATT&CK ICS docs (technique IDs, mitigation/detection text), asset metadata, historical attack instances. Use the ATT&CK ICS technique model as canonical schema. ([MITRE ATT&CK][1])
   * Implement a **Rule Engine** (Drools or custom policy module) for hard constraints (e.g., do not suggest any mitigation that would shut down safety functions without human approval).
3. **Feature & Evidence Extraction**
   
   * For each candidate pair (asset, technique) compute features: presence of vulnerable config flags, evidence counts (logs showing Indicators of Compromise), past success rate of same technique on similar assets (from other sites), whether detection controls exist, uptime/criticality score of asset, estimated operation cost to apply mitigation.
   * Also compute textual embeddings of asset configs, logs, and ATT&CK technique text (SentenceTransformers) for similarity retrieval.
4. **Candidate Generation**
   
   * **Deterministic candidates** from KG: for each technique, fetch canonical detections/mitigations linked to that technique (ATT&CK).
   * **Graph propagation**: run a GNN (LightGCN / simplified GNN) on the bipartite graph (assets ↔ techniques ↔ mitigations) to surface additional candidates implied by neighboring nodes and cross-site patterns. Use precomputed embeddings + neighbor aggregation to propose candidates even when explicit evidence is sparse. ([arXiv][2])
   * **Case retrieval**: retrieve similar past cases (other sites) using embedding similarity and KG similarity to propose empirically-effective mitigations.
5. **Ranking & Scoring**
   
   * Take the union of candidates and compute a ranking score using an **ensemble**:
     
     * Rule score (binary constraints / must-have)
     * Evidence score (normalized log match counts, correlation to technique patterns)
     * Graph-propagation score (GNN output probability)
     * Case similarity score (retrieval similarity)
     * Cost/impact adjustment (operation disruption factor)
   * Use a supervised ranker (LightGBM or small neural ranker) trained on historical outcomes (e.g., mitigations that reduced re-occurrence, detection rules that yielded correct alerts) to produce final **priority** (continuous score) and a raw predictive probability.
6. **Generative Assembly (RAG + LLM)**
   
   * For the top-N ranked items, run a Retrieval-Augmented Generation step:
     
     * Retriever pulls supporting documents: MITRE mitigation/detection text, matching log excerpts, config lines, case notes.
     * LLM (local or hosted) generates structured recommendations, constrained by a **template** and required fields (technique IDs, exact rule snippets, SIEM detection logic, suggested configuration changes, roll-back steps).
   * **Crucially**: attach provenance and grounding for every sentence (doc IDs + offsets) and include the exact evidence that supports the recommendation to avoid hallucinations. Use citation links to KG nodes and MITRE docs. ([ScienceDirect][3])
7. **Calibration & Confidence**
   
   * Combine the ranker probability, retrieval similarity, rule confidence and evidence counts into a calibrated **confidence score (0–1)** using isotonic regression or Platt scaling on validation data. See "Confidence Computation" below.
8. **Feedback & Continuous Learning**
   
   * Ingest which recommendations were implemented and the resulting outcomes (attack suppression, false positives, operational impact). Retrain ranker and refine GNN periodically.
   * Use Caldera to simulate new adversary emulations on a staging network to validate and collect labels before production rollout. ([Caldera Documentation][4])

---

# 4. Data & model choices (practical recommendations)

* **Knowledge Graph DB:** Neo4j / Amazon Neptune / TigerGraph.
* **Vector store / retriever:** FAISS / Milvus / Chroma for embeddings of ATT&CK items, configs, logs.
* **Embeddings:** SentenceTransformers (all-minilm or domain-adapted model) for logs/configs; fine-tune on ICS text if you have labeled data.
* **GNN / graph recommender:** LightGCN (or a lightweight, distilled GNN) for candidate scoring & propagation (fast and effective). ([arXiv][2])
* **Ranker:** LightGBM or XGBoost with SHAP explainability; fallback to a small neural ranker if you want end-to-end training.
* **LLM / GenAI:** Use a retrieval-grounded LLM (RAG pattern). Host a model you can control (e.g., local Llama-family / other enterprise LLM) or use a vetted cloud LLM with strict prompt and context limits; never rely on the LLM alone for mapping to MITRE IDs (always attach KG grounding). ([ScienceDirect][3])
* **Rule Engine:** Drools or OPA (Open Policy Agent) for safety policies.
* **SIEM connectors:** Splunk, Elastic, Wazuh, QRadar; the pipeline should parse saved searches and detection rule identifiers so you can recommend new SIEM rules and check for duplicates. (Caldera + Wazuh is a good simulation combo; see docs). ([Wazuh][5])

# 5. Confidence score — concrete method

For a candidate recommendation (c), compute components:

* $$
  (S_{evidence}) = normalized evidence score (0–1), e.g. logistic(α * log(1 + matched_event_count) + β * avg_match_strength)
  $$
* $$
  (S_{graph}) = GNN probability (0–1)
  
* 
  (S_{case}) = retrieval similarity to successful historical cases (cosine similarity mapped to [0,1])
  $$
* $$
  (S_{rule}) = rule confidence (1.0 if deterministic rule caused this candidate; else 0)
  $$
* $$
  (C_{cost}) = cost factor (0–1) where 1 = no disruption / low cost, 0 = high disruption
  $$

Raw combined score:

$$
\text{raw} = w_1 S_{evidence} + w_2 S_{graph} + w_3 S_{case} + w_4 S_{rule} + w_5 C_{cost}
$$

Choose weights (w_i) via validation (e.g., w4 higher for rule matches), then calibrate raw via isotonic regression on held-out validation data to produce final **confidence ∈ [0,1]**. Provide per-component contributions in the output for transparency.

# 6. Priority ranking (example formula)

$$
Estimated priority = ( \text{ImpactScore} \times \text{confidence}^\gamma / (1 + \text{EstimatedEffort}) )
$$

* ImpactScore: computed from asset criticality × expected reduction in detection time (learned from cases)
* EstimatedEffort: normalized work-hours or operational disruption (0..10)
* γ: exponent to control confidence sharpening (e.g., γ=1.5)

This gives a numeric priority score you can sort by.

# 7. Safety & testing (must-do steps)

1. **Offline validation**: compute precision@k and recall for historical cases.
2. **Staged simulation**: run Caldera adversary emulations in a staging lab that mirrors production (or on a VM network). Validate that recommended detection rules trigger correctly and mitigations do not break control loops. Use Caldera’s documented emulation flows. ([Caldera Documentation][4])
3. **Human-in-the-loop**: always require human approval for high-impact mitigations (e.g., any change requiring device restart or safety loop interruption).
4. **Monitoring**: track false positive rate of newly recommended detection rules and operational incidents after mitigation changes.

# 8. Evaluation strategy & metrics

**Offline metrics**

* Precision@K, Recall@K for top-K recommended mitigations/detections vs. ground truth (from MITRE case labels or historical outcomes).
* ROC/AUC and calibration metrics for confidence (Brier score, reliability plots).

**Operational metrics (post rollout)**

* Reduction in mean time to detect (MTTD) and mean time to respond (MTTR) for techniques that were observed previously.
* Reduction in repeat successful attacks (per technique) after applying mitigations.
* False Positive Rate (FPR) of recommended detection rules.
* Operational cost / downtime introduced by implemented mitigations.

**Safety checks**

* % of recommendations blocked by policy engine (should be low if KG is complete).
* Number of human reversals (mitigation rolled back due to operational impact).

**Validation with Caldera**

* Use Caldera to simulate ATT&CK ICS techniques and evaluate: did recommended detection rules catch the emulation runs? Did mitigations reduce success rates? Caldera is the recommended emulation platform. ([caldera.mitre.org][6])

# 9. Integration plan

1. **MVP (4–8 weeks)**
   
   * Build ingestion + canonical schema.
   * Import MITRE ATT&CK ICS as the KG core. ([MITRE ATT&CK][1])
   * Implement deterministic mapping: for each technique, generate ATT&CK detection & mitigation candidates from MITRE text.
   * Output JSON templates for recommendations (see example below).
2. **Phase 2 (8–16 weeks)**
   
   * Add retrieval engine (embeddings), case retrieval, and a supervised ranker trained on historical incidents.
   * Integrate with SIEM to test generated detection rule snippets (syntactic checks).
   * Start Caldera simulations in staging and collect labels.
3. **Phase 3 (ongoing)**
   
   * Deploy GNN / LightGCN to improve candidate generation; integrate RAG + LLM for human-friendly machine-readable outputs; implement feedback loop and online learning (bandit) cautiously. ([arXiv][2])
4. **Governance**
   
   * Add policy engine and approval workflow for mitigation deployment. Use audit logging & version control for recommendations.

# 10. Example output format (machine-readable JSON)

Below is a concrete JSON schema and an example filled entry. The schema is intentionally verbose so each recommendation is auditable.

```json
{
  "recommendations": [
    {
      "rec_id": "rec-20251003-0001",
      "asset_id": "PLC-ASEM-01",
      "asset_type": "Siemens-S7-300",
      "recommendation_type": "detection",           // detection | mitigation
      "title": "Detect unexpected Modbus write sequences to critical registers",
      "description": "Add SIEM rule to detect Modbus function code 0x10 (Write Multiple Registers) to control registers mapped to valve actuators when originating from non-OT management subnets.",
      "mitre_technique_ids": ["T0837", "T0869"],
      "priority_score": 0.87,
      "confidence": 0.78,
      "confidence_components": {
        "evidence_score": 0.60,
        "graph_score": 0.85,
        "case_similarity": 0.72,
        "rule_match": 0.0,
        "cost_factor": 0.9
      },
      "inputs_relied_on": [
        {"type":"asset_register","ref":"PLC-ASEM-01"},
        {"type":"config","ref":"PLC-ASEM-01/modbus_map.csv"},
        {"type":"siem_logs","ref":"siem-12345","matched_events":17},
        {"type":"att&ck","ref":"attack.mitre.org/T0869"}
      ],
      "evidence_snippets": [
        {
          "source":"siem-12345",
          "time":"2025-09-28T13:42:01Z",
          "snippet":"Modbus write to register 0x01A3 from 10.10.5.78 function 0x10"
        }
      ],
      "recommended_actions": [
        {
          "action_id":"act-001",
          "short":"Create SIEM detection rule",
          "details":"SIEM saved search: if Modbus function==0x10 and target_register in [0x01A0..0x01AF] and source_net NOT IN [10.10.0.0/16], raise HIGH alert. Include packet capture and full TCP stream.",
          "required_changes":[{"system":"SIEM","change":"Add saved search"}, {"system":"Network","change":"Tag OT mgmt subnet"}],
          "estimated_effort_hours":3
        }
      ],
      "expected_impact": "High (will detect lateral writes to actuator registers that caused prior incident #456)",
      "estimated_cost_score": 0.2,
      "provenance": {
        "kg_nodes":[ "ATTACK:T0869", "Asset:PLC-ASEM-01", "Config:PLC-ASEM-01/modbus_map.csv", "Case:case-20240315" ],
        "mitre_sources":[ "attack.mitre.org/techniques/T0869", "attack.mitre.org/mitigations/M0931" ]
      },
      "policy_flags": {
        "requires_human_approval": true,
        "safety_risk_level": "medium"
      },
      "timestamp":"2025-10-03T08:22:00Z"
    }
  ]
}
```

# 11. Example short human + machine-readable mitigation suggestion (for the same technique)

* **Mitigation (rec_id rec-20251003-0002)**
  
  * **Title:** "Implement network segmentation and enforce ACLs between IT/OT management subnets"
  * **MITRE IDs:** M0931 (Network Intrusion Prevention), M0801 (Access Management). ([MITRE ATT&CK][7])
  * **Recommended actions:** apply ACLs on routers to restrict Modbus/OPC traffic, enable Intrusion Prevention with protocol understanding for modbus/DNP3, schedule maintenance window for config rollout.
  * **Confidence:** 0.82 (KG rule + high case similarity + GNN propagation).
  * **Estimated effort:** 16 hours (network change) — flagged requires scheduled maintenance and human approval.

# 12. Practical tips & pitfalls

* **Do not let the LLM decide mappings to ATT&CK IDs.** Always derive technique IDs from KG retrieval / deterministic string matching and attach them explicitly—LLM can rephrase but grounding must be authoritative. (Use ATT&CK docs as canonical mapping.) ([MITRE ATT&CK][1])
* **Use Caldera for safe testing.** Emulate techniques before deploying a detection or mitigation in production to avoid breaking control/real-time loops. ([Caldera Documentation][8])
* **Keep the policy engine first-class.** Any mitigation that affects safety loops or device availability must be triaged for human approval.
* **Calibrate confidence** — calibration is as important as ranking. Provide component breakdowns so operators can judge why the system recommended something.

# 13. Short roadmap & milestones

* Week 0–2: Ingest MITRE ATT&CK ICS, build initial KG, ingest asset register. (MVP: deterministic mapping outputs) ([MITRE ATT&CK][1])
* Week 3–6: Hook up SIEM logs, build evidence extractor, implement deterministic detection/mitigation templates, output JSON recommendations.
* Week 7–12: Add retrieval, embeddings, LightGBM ranker; collect labels from historical incidents.
* Week 13–20: Add GNN (LightGCN), RAG + LLM for enriched textual outputs, staged Caldera simulation & offline evaluation. ([arXiv][2])
* Ongoing: Deploy with human-in-loop approvals, gather feedback, calibrate, and consider safe online adaptation (contextual bandit).

# 14. Five brief citations for the most important foundations

* MITRE ATT&CK for ICS design & schema (canonical technique/mitigation/detection model). ([MITRE ATT&CK][1])
* ATT&CK ICS technique & mitigations pages (live reference). ([MITRE ATT&CK][9])
* Caldera — recommended adversary emulation platform for safe simulation and validation. ([caldera.mitre.org][6])
* Generative AI for cybersecurity — use RAG and grounding; caution against hallucination. ([ScienceDirect][3])
* LightGCN (and GNNs) — effective, scalable graph recommender model suitable for propagating ICS signals. ([arXiv][2])

[1]: https://attack.mitre.org/docs/ATTACK_for_ICS_Philosophy_March_2020.pdf

[2]: https://arxiv.org/abs/2002.02126

[3]: https://www.sciencedirect.com/science/article/pii/S0167739X25004017

[4]: https://caldera.readthedocs.io/

[5]: https://wazuh.com/blog/adversary-emulation-with-caldera-and-wazuh/

[6]: https://caldera.mitre.org/

[7]: https://attack.mitre.org/mitigations/M0931/

[8]: https://caldera.readthedocs.io/en/latest/Getting-started.html

[9]: https://attack.mitre.org/techniques/ics/

