import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { FloorPlansService } from '../src/modules/floor-plans/floor-plans.service.js';
import { ExhibitionsService } from '../src/modules/exhibitions/exhibitions.service.js';

const prisma = new PrismaClient();

describe('Stall Deletion and Accurate Exhibition Stall Count Updates', () => {
  it('should cleanly delete unbooked stalls, update exhibition stall counts, and allow re-adding same stall identifier', async () => {
    const testSlug = `test-del-stall-${Date.now()}`;
    const exhibition = await ExhibitionsService.createExhibition({
      title: 'Stall Deletion Test Expo',
      slug: testSlug,
      description: 'Testing stall deletion and real-time count sync',
      venue: 'Pragati Maidan Hall 1',
      city: 'New Delhi',
      status: 'PUBLISHED',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      totalStalls: 3,
    });

    const floorPlan = (exhibition as any).floorPlans[0];

    try {
      // 1. Initial floor plan sync with 3 stalls (A-101, A-102, A-103)
      const sync1 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        name: 'Hall 1 Layout',
        width: 1400,
        height: 850,
        layoutData: { halls: [], facilities: [] },
        stalls: [
          { stallNumber: 'A-101', name: 'Stall A-101', width: 60, height: 60, xPosition: 10, yPosition: 10, price: 50000, status: 'AVAILABLE' },
          { stallNumber: 'A-102', name: 'Stall A-102', width: 60, height: 60, xPosition: 80, yPosition: 10, price: 50000, status: 'AVAILABLE' },
          { stallNumber: 'A-103', name: 'Stall A-103', width: 60, height: 60, xPosition: 150, yPosition: 10, price: 50000, status: 'AVAILABLE' },
        ],
      });

      assert.strictEqual(sync1.stalls.length, 3, 'Initial sync must have 3 stalls');

      // Verify listExhibitions returns totalStalls = 3
      const listBefore = await ExhibitionsService.listExhibitions('PUBLISHED', 'Stall Deletion Test Expo');
      const foundBefore = listBefore.find((e: any) => e.id === exhibition.id);
      assert.strictEqual(foundBefore?.totalStalls, 3, 'Exhibition list must show 3 total stalls initially');

      // 2. Delete stall A-103 and sync with remaining 2 stalls (A-101, A-102)
      const sync2 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        name: 'Hall 1 Layout',
        width: 1400,
        height: 850,
        layoutData: { halls: [], facilities: [] },
        stalls: [
          { id: sync1.stalls[0].id, stallNumber: 'A-101', name: 'Stall A-101', width: 60, height: 60, xPosition: 10, yPosition: 10, price: 50000, status: 'AVAILABLE' },
          { id: sync1.stalls[1].id, stallNumber: 'A-102', name: 'Stall A-102', width: 60, height: 60, xPosition: 80, yPosition: 10, price: 50000, status: 'AVAILABLE' },
        ],
      });

      assert.strictEqual(sync2.stalls.length, 2, 'Returned floor plan stalls count must be 2 after deleting 1 stall');
      assert.ok(!sync2.stalls.some((s) => s.stallNumber === 'A-103'), 'Deleted stall A-103 must not be returned in floor plan stalls');

      // Verify exhibition record in DB has totalStalls = 2
      const updatedExhibitionDb = await prisma.exhibition.findUnique({ where: { id: exhibition.id } });
      assert.strictEqual(updatedExhibitionDb?.totalStalls, 2, 'Exhibition record totalStalls must be updated to 2 in database');

      // Verify listExhibitions returns updated stall count of 2
      const listAfter = await ExhibitionsService.listExhibitions('PUBLISHED', 'Stall Deletion Test Expo');
      const foundAfter = listAfter.find((e: any) => e.id === exhibition.id);
      assert.strictEqual(foundAfter?.totalStalls, 2, 'Exhibition list must reflect updated stall count of 2');

      // Verify getExhibitionBySlugOrId returns updated stall count of 2
      const fetchedDetail = await ExhibitionsService.getExhibitionBySlugOrId(exhibition.id);
      assert.strictEqual(fetchedDetail.totalStalls, 2, 'Exhibition detail must reflect updated stall count of 2');
      assert.strictEqual(fetchedDetail.floorPlans[0].stalls.length, 2, 'Exhibition floor plan stalls array must contain only 2 stalls');

      // 3. Re-add a stall using the previously deleted stallNumber 'A-103'
      // This MUST NOT fail with unique constraint violation!
      const sync3 = await FloorPlansService.syncFloorPlan(floorPlan.id, {
        name: 'Hall 1 Layout',
        width: 1400,
        height: 850,
        layoutData: { halls: [], facilities: [] },
        stalls: [
          { id: sync1.stalls[0].id, stallNumber: 'A-101', name: 'Stall A-101', width: 60, height: 60, xPosition: 10, yPosition: 10, price: 50000, status: 'AVAILABLE' },
          { id: sync1.stalls[1].id, stallNumber: 'A-102', name: 'Stall A-102', width: 60, height: 60, xPosition: 80, yPosition: 10, price: 50000, status: 'AVAILABLE' },
          { stallNumber: 'A-103', name: 'Stall A-103 Recreated', width: 60, height: 60, xPosition: 150, yPosition: 10, price: 55000, status: 'AVAILABLE' },
        ],
      });

      assert.strictEqual(sync3.stalls.length, 3, 'Re-adding stall A-103 must succeed with 3 total stalls');
      const reAdded = sync3.stalls.find((s) => s.stallNumber === 'A-103');
      assert.ok(reAdded, 'Re-added stall A-103 must exist in floor plan');

      // Verify listExhibitions reflects 3 stalls again
      const listAfterReAdd = await ExhibitionsService.listExhibitions('PUBLISHED', 'Stall Deletion Test Expo');
      const foundAfterReAdd = listAfterReAdd.find((e: any) => e.id === exhibition.id);
      assert.strictEqual(foundAfterReAdd?.totalStalls, 3, 'Exhibition list must reflect 3 total stalls after re-add');

    } finally {
      // Clean up
      await prisma.stall.deleteMany({ where: { floorPlanId: floorPlan.id } });
      await prisma.floorPlan.deleteMany({ where: { exhibitionId: exhibition.id } });
      await prisma.exhibition.delete({ where: { id: exhibition.id } });
    }
  });
});
