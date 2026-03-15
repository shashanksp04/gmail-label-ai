/**
 * LabelPilot - Classification engine (BUILD_SPEC section 7)
 * Pipeline: deterministic match -> AI fallback (if needed) -> confidence evaluation
 */

const ClassifierEngine = {
  /**
   * Classify email and return best label if confidence exceeds threshold
   * @param {Object} email - parsed email metadata
   * @param {Array} labels - user labels
   * @param {Object} context - { senderMappings, threadLabelId }
   * @returns {Promise<{labelId: string, labelName: string} | null>}
   */
  async classify(email, labels, context = {}) {
    if (!labels?.length) return null;

    const senderMappings = context.senderMappings || {};
    const threadLabelId = context.threadLabelId || null;

    // 1. Deterministic scoring
    const scored = DeterministicMatcher.scoreAllLabels(email, labels, {
      senderMappings,
      threadLabelId,
    });

    // 2. Check if top score meets threshold
    const top = scored[0];
    if (top && top.score >= CONFIG.MIN_CONFIDENCE_THRESHOLD) {
      return { labelId: top.label.id, labelName: top.label.name };
    }

    // 3. AI fallback when deterministic is insufficient
    const aiResult = await AIFallback.selectLabel(email, labels);
    if (aiResult) {
      return { labelId: aiResult.id, labelName: aiResult.name };
    }

    // 4. No confident match - leave email unchanged (conservative)
    return null;
  },
};
