function buildOnePageImposedSpreads(pages) {
  if (!Array.isArray(pages) || pages.length !== 4) {
    throw new Error('Expected exactly 4 reading-order pages for 1-page imposition');
  }

  const byNumber = new Map(pages.map((page) => [page.pageNumber, page]));

  return [
    { sheet: 1, side: 'front', left: byNumber.get(4), right: byNumber.get(1) },
    { sheet: 1, side: 'back', left: byNumber.get(2), right: byNumber.get(3) }
  ];
}

module.exports = {
  buildOnePageImposedSpreads
};
