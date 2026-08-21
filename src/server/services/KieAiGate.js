function assertKieAiEnabled() {
  if (process.env.KIE_API_ENABLED !== 'true') {
    throw new Error('Kie.ai API calls are disabled (set KIE_API_ENABLED=true only to re-enable)');
  }
}

module.exports = { assertKieAiEnabled };
