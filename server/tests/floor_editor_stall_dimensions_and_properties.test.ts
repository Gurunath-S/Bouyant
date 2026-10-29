import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { FloorPlansService } from '../src/modules/floor-plans/floor-plans.service.js';
import { ExhibitionsService } from '../src/modules/exhibitions/exhibitions.service.js';

const prisma = new PrismaClient();

describe('Floor Design Editor Stall Properties, Physical Dimensions, and Color Persistence', () => {
  it('should verify physical dimensions remain strictly independent of canvas pixel dimensions', async () => {
    // 1. Create temporary exhibition and floor plan
    const testSlug = `test-fp-dim-${Date.now()}`;
    const exhibition = await ExhibitionsService.createExhibition({
      title: 'Floor Editor Dimensions Test Expo',
      slug: testSlug,
      description: 'Testing stall physical dimensions independence from canvas size',
      venue: 'Pragati Maidan Hall 5',
      address: 'Mathura Road, New Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    });

    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: 'Hall 5 Ground Layout',
        width: 1200,
        height: 800,
      },
    });

    try {
      // 2. Initial synchronization with physical dimensions (3m × 3m) and canvas display size (60px × 60px)
      const initialLayout = {
        zoom: 1,
        pan: { x: 0, y: 0 },
        stallPhysicalDimensions: {
          'stall-A101': { width: 3, height: 3, unit: 'm' },
        },
        stallColors: {
          'stall-A101': '#059669',
        },
      };

      const syncResult1 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        name: 'Hall 5 Ground Layout',
        width: 1200,
        height: 800,
        layoutData: initialLayout,
        stalls: [
          {
            stallNumber: 'A101',
            name: 'Stall A101',
            category: 'PREMIUM',
            price: 75000,
            areaSqFt: 97, // 3m × 3m = 9m² ~ 97 sq.ft
            width: 60, // Canvas width in px
            height: 60, // Canvas height in px
            xPosition: 100,
            yPosition: 100,
            status: 'AVAILABLE',
          },
        ],
      });

      assert.ok(syncResult1, 'Initial sync successful');
      assert.strictEqual(syncResult1.stalls.length, 1);
      const stallA101 = syncResult1.stalls[0];
      assert.strictEqual(stallA101.width, 60, 'Canvas width must be 60px');
      assert.strictEqual(stallA101.height, 60, 'Canvas height must be 60px');

      const parsedLayout1 = JSON.parse(syncResult1.backgroundUrl || '{}');
      assert.deepStrictEqual(
        parsedLayout1.stallPhysicalDimensions['stall-A101'],
        { width: 3, height: 3, unit: 'm' },
        'Physical dimensions must be 3m × 3m'
      );
      assert.strictEqual(parsedLayout1.stallColors['stall-A101'], '#059669', 'Stall custom color must be #059669');

      // 3. Update Actual Physical Dimensions (e.g. from 3m × 3m to 4.5m × 3m)
      // Visual canvas dimensions (60px × 60px) must NOT change!
      const updatedLayout2 = {
        ...parsedLayout1,
        stallPhysicalDimensions: {
          'stall-A101': { width: 4.5, height: 3, unit: 'm' },
        },
      };

      const syncResult2 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        layoutData: updatedLayout2,
        stalls: [
          {
            id: stallA101.id,
            stallNumber: 'A101',
            name: 'Stall A101',
            category: 'PREMIUM',
            price: 85000,
            areaSqFt: 145, // 4.5m × 3m = 13.5m² ~ 145 sq.ft
            width: 60, // Canvas width remains 60px!
            height: 60, // Canvas height remains 60px!
            xPosition: 100,
            yPosition: 100,
            status: 'AVAILABLE',
          },
        ],
      });

      const stallAfterPhysChange = syncResult2.stalls[0];
      assert.strictEqual(stallAfterPhysChange.width, 60, 'Visual canvas width must remain 60px when physical dimension changes');
      assert.strictEqual(stallAfterPhysChange.height, 60, 'Visual canvas height must remain 60px when physical dimension changes');
      const parsedLayout2 = JSON.parse(syncResult2.backgroundUrl || '{}');
      assert.deepStrictEqual(
        parsedLayout2.stallPhysicalDimensions['stall-A101'],
        { width: 4.5, height: 3, unit: 'm' },
        'Updated physical dimensions must persist'
      );
      assert.strictEqual(parsedLayout2.stallColors['stall-A101'], '#059669', 'Color must remain preserved');

      // 4. Update UI Display Size on canvas (e.g. from 60px × 60px to 100px × 80px)
      // Physical dimensions must NOT be overwritten!
      const syncResult3 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        layoutData: parsedLayout2,
        stalls: [
          {
            id: stallA101.id,
            stallNumber: 'A101',
            name: 'Stall A101',
            category: 'PREMIUM',
            price: 85000,
            areaSqFt: 145,
            width: 100, // Visual canvas width updated
            height: 80, // Visual canvas height updated
            xPosition: 100,
            yPosition: 100,
            status: 'AVAILABLE',
          },
        ],
      });

      const stallAfterVisualChange = syncResult3.stalls[0];
      assert.strictEqual(stallAfterVisualChange.width, 100, 'Visual canvas width must update to 100px');
      assert.strictEqual(stallAfterVisualChange.height, 80, 'Visual canvas height must update to 80px');
      const parsedLayout3 = JSON.parse(syncResult3.backgroundUrl || '{}');
      assert.deepStrictEqual(
        parsedLayout3.stallPhysicalDimensions['stall-A101'],
        { width: 4.5, height: 3, unit: 'm' },
        'Physical dimensions must remain 4.5m × 3m and NOT be overwritten by visual canvas size changes'
      );

      // 5. Verify availability status protection against overriding booked/held state
      // Manually set stall status to BOOKED_CONFIRMED to simulate active booking
      await prisma.stall.update({
        where: { id: stallA101.id },
        data: { status: 'BOOKED_CONFIRMED' },
      });

      // Try syncing with status: AVAILABLE - the server must safeguard and preserve BOOKED_CONFIRMED
      const syncResult4 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        layoutData: parsedLayout3,
        stalls: [
          {
            id: stallA101.id,
            stallNumber: 'A101',
            name: 'Stall A101 Renamed',
            category: 'PREMIUM',
            price: 90000,
            width: 100,
            height: 80,
            xPosition: 100,
            yPosition: 100,
            status: 'AVAILABLE', // Attempting to override booked status
          },
        ],
      });

      const bookedStall = syncResult4.stalls[0];
      assert.strictEqual(
        bookedStall.status,
        'BOOKED_CONFIRMED',
        'Booked status must NOT be overridden by editor synchronization'
      );
      assert.strictEqual(bookedStall.name, 'Stall A101 Renamed', 'Other allowed fields such as name must update cleanly');

      // 6. Verify handling of stalls with missing physical dimensions
      const syncResult5 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        layoutData: {
          zoom: 1,
          pan: { x: 0, y: 0 },
        }, // No stallPhysicalDimensions in layoutData
        stalls: [
          {
            stallNumber: 'B201',
            name: 'Stall B201',
            category: 'STANDARD',
            price: 50000,
            width: 60,
            height: 40,
            xPosition: 200,
            yPosition: 200,
            status: 'AVAILABLE',
          },
        ],
      });

      assert.ok(syncResult5, 'Sync with missing physical dimensions must succeed without throwing');
      const legacyStall = syncResult5.stalls.find((s) => s.stallNumber === 'B201');
      assert.ok(legacyStall, 'Legacy stall without explicit physical dimensions must be saved successfully');
    } finally {
      // Clean up
      await prisma.stall.deleteMany({
        where: { floorPlanId: floorPlan.id },
      });
      await prisma.floorPlan.deleteMany({
        where: { exhibitionId: exhibition.id },
      });
      await prisma.exhibition.delete({
        where: { id: exhibition.id },
      });
    }
  });
});
