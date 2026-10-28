import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAP_SIZE, boundsBox, fitViewBox, fitViewBoxInset, landBox, project, spreadPins, toPercent } from './worldMap.ts';

test('the projection puts west on the left and north at the top', () => {
  const greenwich = project(0, 0);
  assert.equal(greenwich.x, MAP_SIZE / 2);
  assert.ok(Math.abs(greenwich.y - MAP_SIZE / 2) < 1e-9);
  assert.ok(project(-80, 0).x < project(10, 0).x);
  assert.ok(project(0, 52).y < project(0, -37).y);
  assert.equal(project(-180, 0).x, 0);
  assert.equal(project(180, 0).x, MAP_SIZE);
});

test('the land box spans the world and stays inside the Mercator square', () => {
  const land = landBox();
  assert.equal(land.x, 0);
  assert.equal(land.w, MAP_SIZE);
  assert.ok(land.y > 0 && land.y + land.h < MAP_SIZE);
});

test('a fitted view keeps the whole region and takes the container shape', () => {
  const europe = boundsBox({ west: -9, east: 23, south: 38, north: 55.5 });
  for (const aspect of [0.6, 1, 16 / 9, 2.4]) {
    const vb = fitViewBox(europe, aspect);
    assert.ok(Math.abs(vb.w / vb.h - aspect) < 1e-9, `aspect ${aspect}`);
    assert.ok(vb.x <= europe.x && vb.x + vb.w >= europe.x + europe.w);
    assert.ok(vb.y <= europe.y && vb.y + vb.h >= europe.y + europe.h);
    // centred on the region
    assert.ok(Math.abs(vb.x + vb.w / 2 - (europe.x + europe.w / 2)) < 1e-9);
  }
});

test('a broken container size falls back to the region shape', () => {
  const box = { x: 0, y: 0, w: 200, h: 100 };
  for (const aspect of [0, NaN, Infinity]) {
    const vb = fitViewBox(box, aspect, 0);
    assert.equal(vb.w, 200);
    assert.equal(vb.h, 100);
  }
});

test('an inset view keeps the region clear of the top and bottom overlays', () => {
  const europe = boundsBox({ west: -9, east: 23, south: 38, north: 55.5 });
  const width = 1280;
  const height = 700;
  const inset = { top: 80, bottom: 60 };
  const vb = fitViewBoxInset(europe, width, height, inset);
  assert.ok(Math.abs(vb.w / vb.h - width / height) < 1e-9, 'fills the whole container');
  const top = toPercent({ x: europe.x, y: europe.y }, vb).top / 100 * height;
  const bottom = toPercent({ x: europe.x, y: europe.y + europe.h }, vb).top / 100 * height;
  assert.ok(top >= inset.top - 1e-6, `region top ${top} clears the title strip`);
  assert.ok(bottom <= height - inset.bottom + 1e-6, `region bottom ${bottom} clears the status strip`);
  // A container too short for its overlays still gets a sane view.
  const squashed = fitViewBoxInset(europe, 400, 100, inset);
  assert.ok(squashed.w > 0 && squashed.h > 0);
});

test('percentages place a point across the view', () => {
  const vb = { x: 100, y: 50, w: 200, h: 100 };
  assert.deepEqual(toPercent({ x: 100, y: 50 }, vb), { left: 0, top: 0 });
  assert.deepEqual(toPercent({ x: 300, y: 150 }, vb), { left: 100, top: 100 });
  assert.deepEqual(toPercent({ x: 200, y: 100 }, vb), { left: 50, top: 50 });
});

test('crowded pins are pushed apart; spaced ones stay put', () => {
  const spaced = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
  assert.deepEqual(spreadPins(spaced, 50), spaced);

  // Sepang and Singapore, about 18 px apart on a desktop Asia-Pacific view.
  const crowded = spreadPins([{ x: 300, y: 400 }, { x: 315, y: 410 }, { x: 600, y: 100 }], 52);
  assert.ok(Math.hypot(crowded[1].x - crowded[0].x, crowded[1].y - crowded[0].y) >= 52 - 1e-6);
  assert.deepEqual(crowded[2], { x: 600, y: 100 }, 'a pin far from the pair does not move');

  const stacked = spreadPins([{ x: 10, y: 10 }, { x: 10, y: 10 }], 40);
  assert.ok(Math.hypot(stacked[1].x - stacked[0].x, stacked[1].y - stacked[0].y) >= 40 - 1e-6);
});
