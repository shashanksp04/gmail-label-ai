/**
 * LabelPilot - Deterministic label matching (BUILD_SPEC section 8)
 */

const DeterministicMatcher = {
  /**
   * Score a label against email metadata
   * @param {Object} email - { subject, from, fromEmail, snippet }
   * @param {Object} label - { id, name, normalizedName }
   * @param {Object} context - { senderMappings, threadLabelId }
   * @returns {number} score
   */
  scoreLabel(email, label, context = {}) {
    const { senderMappings = {}, threadLabelId } = context;
    let score = 0;

    const domain = extractDomain(email.fromEmail);
    const senderNameFromDomain = extractSenderNameFromDomain(email.fromEmail);

    // Historical sender mapping (highest weight)
    if (senderMappings[domain] === label.id) {
      score += CONFIG.SCORES.HISTORICAL_SENDER_MAPPING;
    }

    // Thread match
    if (threadLabelId === label.id) {
      score += CONFIG.SCORES.THREAD_MATCH;
    }

    // Subject match (exact or normalized)
    if (textContainsLabel(email.subject, label.name)) {
      score += CONFIG.SCORES.SUBJECT_MATCH;
    }

    // Sender name match
    if (textContainsLabel(email.from, label.name) || textContainsLabel(senderNameFromDomain, label.name)) {
      score += CONFIG.SCORES.SENDER_NAME_MATCH;
    }

    // Sender domain match (e.g., alphasignal.ai -> AlphaSignal)
    if (textContainsLabel(label.name, senderNameFromDomain) || textContainsLabel(label.name, domain)) {
      score += CONFIG.SCORES.SENDER_DOMAIN_MATCH;
    }

    // Snippet similarity
    const snippetSim = wordOverlapSimilarity(email.snippet, label.name);
    if (snippetSim > 0.3) {
      score += Math.round(CONFIG.SCORES.SNIPPET_SIMILARITY * snippetSim);
    }

    return score;
  },

  /**
   * Score all labels and return sorted by score (desc)
   */
  scoreAllLabels(email, labels, context = {}) {
    return labels
      .map((label) => ({
        label,
        score: this.scoreLabel(email, label, context),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  },
};
