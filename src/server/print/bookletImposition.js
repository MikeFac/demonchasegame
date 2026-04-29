function buildImposedSpreads(pages) {
  if (!Array.isArray(pages) || pages.length !== 8) {
    throw new Error('Expected exactly 8 reading-order pages for booklet imposition');
  }

  const byNumber = new Map(pages.map((page) => [page.pageNumber, page]));

  return [
    { sheet: 1, side: 'front', left: byNumber.get(8), right: byNumber.get(1) },
    { sheet: 1, side: 'back', left: byNumber.get(2), right: byNumber.get(7) },
    { sheet: 2, side: 'front', left: byNumber.get(6), right: byNumber.get(3) },
    { sheet: 2, side: 'back', left: byNumber.get(4), right: byNumber.get(5) }
  ];
}

module.exports = {
  buildImposedSpreads
};
