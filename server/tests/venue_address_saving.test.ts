import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { ExhibitionsService } from '../src/modules/exhibitions/exhibitions.service';

const prisma = new PrismaClient();

describe('Exhibition Full Venue Address Persistence', () => {
  it('should create an exhibition with full venue address and retrieve it properly', async () => {
    const testSlug = `test-address-event-${Date.now()}`;
    const initialAddress = 'NSE Nesco Complex, Off Western Express Hwy, Goregaon East, Mumbai 400063';
    
    const created = await ExhibitionsService.createExhibition({
      title: 'Address Verification Expo',
      slug: testSlug,
      description: 'Testing full venue address saving',
      venue: 'Bombay Exhibition Centre',
      address: initialAddress,
      city: 'Mumbai',
      state: 'Maharashtra',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    });

    assert.ok(created, 'Exhibition was created');
    assert.strictEqual(created.venue, 'Bombay Exhibition Centre');
    assert.strictEqual((created as any).address, initialAddress, 'Initial full venue address must be saved');

    // Fetch by slug / ID
    const fetched = await ExhibitionsService.getExhibitionBySlugOrId(created.id);
    assert.strictEqual((fetched as any).address, initialAddress, 'Fetched exhibition must return saved full venue address');

    // Update with new Full Venue Address
    const updatedAddress = 'Hall 4, Nesco Grounds, Gate 2, Western Express Highway, Goregaon';
    const updated = await ExhibitionsService.updateExhibition(created.id, {
      address: updatedAddress,
    });

    assert.strictEqual((updated as any).address, updatedAddress, 'Updated exhibition must return updated full venue address');

    // Fetch again to verify persistence
    const reFetched = await ExhibitionsService.getExhibitionBySlugOrId(created.id);
    assert.strictEqual((reFetched as any).address, updatedAddress, 'Re-fetched exhibition must persist updated address');

    // Clean up test data
    await prisma.stall.deleteMany({
      where: { floorPlan: { exhibitionId: created.id } },
    });
    await prisma.floorPlan.deleteMany({
      where: { exhibitionId: created.id },
    });
    await prisma.exhibition.delete({
      where: { id: created.id },
    });
  });
});
