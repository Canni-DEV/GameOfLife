export function parseRLE(rleText: string): [number, number][] {
  // Split into lines and find header
  const lines = rleText.split(/\r?\n/);
  const headerIdx = lines.findIndex(line => /^x\s*=\s*\d+/i.test(line));
  if (headerIdx === -1) {
    throw new Error('Invalid RLE: header line not found');
  }

  // Combine all data lines removing whitespace
  const data = lines
    .slice(headerIdx + 1)
    .join('')
    .replace(/\s+/g, '');

  const coords: [number, number][] = [];
  let x = 0, y = 0;
  let countStr = '';

  // RLE parsing state machine
  for (const ch of data) {
    if (/\d/.test(ch)) {
      // Accumulate run count
      countStr += ch;
    } else if (ch === 'b' || ch === 'o') {
      // Determine run length
      const count = countStr === '' ? 1 : parseInt(countStr, 10);
      if (ch === 'o') {
        // 'o' => live cells
        for (let i = 0; i < count; i++) {
          coords.push([x, y]);
          x++;
        }
      } else {
        // 'b' => dead cells: just skip
        x += count;
      }
      countStr = '';
    } else if (ch === '$') {
      // End of row
      const count = countStr === '' ? 1 : parseInt(countStr, 10);
      y += count;
      x = 0;
      countStr = '';
    } else if (ch === '!') {
      // End of pattern
      break;
    }
    // Other chars (e.g., comments) are ignored
  }

  // Center the pattern around (0,0)
  if (coords.length === 0) return [];
  const xs = coords.map(c => c[0]);
  const ys = coords.map(c => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const centerX = Math.floor((minX + maxX) / 2);
  const centerY = Math.floor((minY + maxY) / 2);

  return coords.map(([cx, cy]) => [cx - centerX, cy - centerY]);
}