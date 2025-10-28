/**
 * Background JSON Integration Example
 * 
 * Demonstrates how to integrate background_json PATCH API
 * with the background inheritance system
 */

import { backgroundManager } from '@/lib/backgroundManager'
import { 
  updateCardBackground, 
  persistFrameBackground,
} from '@/lib/api/backgroundService'

/**
 * Example 1: Update card background after storyboard creation
 */
async function example1_updateSingleCard() {
  console.log('\n=== Example 1: Update Single Card Background ===\n')
  
  const cardId = 'card_123'
  const background = 'A calm riverside under sunset'
  
  const result = await updateCardBackground(cardId, background)
  
  if (result.success) {
    console.log('✓ Background updated successfully')
    console.log('  Card ID:', result.data?.id)
    console.log('  Background:', result.data?.background)
    console.log('  Updated at:', result.data?.updated_at)
  } else {
    console.error('✗ Update failed:', result.error)
  }
}

/**
 * Example 2: Integrate with storyboard creation
 */
async function example2_integrateWithStoryboard() {
  console.log('\n=== Example 2: Storyboard Integration ===\n')
  
  // Simulate storyboard scenes
  const scenes = [
    { cardId: 'card_1', description: 'Modern coffee shop with large windows' },
    { cardId: 'card_2', description: 'Coffee shop interior, different angle' },
    { cardId: 'card_3', description: 'Busy city street outside' },
  ]
  
  // Reset inheritance chain
  backgroundManager.resetInheritanceChain()
  
  for (const scene of scenes) {
    console.log(`\nProcessing ${scene.cardId}...`)
    console.log(`  Description: "${scene.description}"`)
    
    // Decide inheritance using semantic comparison
    const metadata = await backgroundManager.decideBackgroundInheritance(
      scene.description
    )
    
    console.log(`  Decision: ${metadata.isInherited ? 'INHERIT' : 'NEW'}`)
    console.log(`  Background ID: ${metadata.id}`)
    
    // Persist to database
    try {
      await persistFrameBackground(scene.cardId, metadata)
      console.log(`  ✓ Persisted to database`)
    } catch (error) {
      console.error(`  ✗ Failed to persist:`, error)
    }
  }
  
  console.log('\n--- Expected Results ---')
  console.log('card_1: NEW background (coffee shop)')
  console.log('card_2: INHERITED background (same coffee shop)')
  console.log('card_3: NEW background (city street)')
}

/**
 * Example 3: Manual metadata conversion
 */
async function example3_manualConversion() {
  console.log('\n=== Example 3: Manual Metadata Conversion ===\n')
  
  // Simulate metadata from background manager
  const metadata = {
    id: 'bg-office-001',
    description: 'Modern office with glass partitions and standing desks',
    keywords: ['office', 'modern', 'glass', 'partitions', 'standing', 'desks'],
    isInherited: false,
  }
  
  console.log('Metadata:')
  console.log('  ID:', metadata.id)
  console.log('  Description:', metadata.description)
  console.log('  Inherited:', metadata.isInherited)
  
  // Store directly as text
  const result = await updateCardBackground('card_456', metadata.description)
  console.log('\nStorage result:', result.success ? '✓ Success' : '✗ Failed')
}

/**
 * Example 4: Batch update workflow
 */
async function example4_batchUpdate() {
  console.log('\n=== Example 4: Batch Update ===\n')
  
  const scenes = [
    {
      cardId: 'card_1',
      background: 'Cozy coffee shop interior',
    },
    {
      cardId: 'card_2', 
      background: 'Cozy coffee shop interior', // Inherited
    },
    {
      cardId: 'card_3',
      background: 'Busy city street',
    },
  ]
  
  const updates = scenes.map(scene => ({
    cardId: scene.cardId,
    background: scene.background,
  }))
  
  console.log(`Updating ${updates.length} cards...`)
  
  const results = await Promise.all(
    updates.map(async ({ cardId, background }) => {
      const result = await updateCardBackground(cardId, background)
      return {
        cardId,
        success: result.success,
        error: result.error,
      }
    })
  )
  
  const successful = results.filter(r => r.success).length
  console.log(`\n✓ ${successful}/${results.length} cards updated successfully`)
  
  results.forEach(result => {
    console.log(`  ${result.cardId}: ${result.success ? '✓' : '✗ ' + result.error}`)
  })
}

/**
 * Example 5: Real-world storyboard pipeline
 */
async function example5_fullPipeline() {
  console.log('\n=== Example 5: Full Pipeline ===\n')
  
  const script = `
    INT. COFFEE SHOP - DAY
    Sarah sits by the window reading a book.
    
    INT. COFFEE SHOP - LATER
    Sarah stands at the counter ordering coffee.
    
    EXT. CITY STREET - DAY
    Sarah walks down the busy street with her coffee.
    
    EXT. CITY STREET - CONTINUOUS
    Sarah stops to check her phone.
  `
  
  // Simulate parsed scenes
  const scenes = [
    { 
      cardId: 'scene_1', 
      order: 0,
      description: 'Coffee shop interior, window seat',
      location: 'Coffee shop',
    },
    { 
      cardId: 'scene_2', 
      order: 1,
      description: 'Coffee shop, counter area',
      location: 'Coffee shop',
    },
    { 
      cardId: 'scene_3', 
      order: 2,
      description: 'Busy city street, daytime',
      location: 'City street',
    },
    { 
      cardId: 'scene_4', 
      order: 3,
      description: 'City street, pedestrian area',
      location: 'City street',
    },
  ]
  
  console.log('Processing storyboard with 4 scenes...\n')
  
  // Reset inheritance
  backgroundManager.resetInheritanceChain()
  
  const results = []
  
  for (const scene of scenes) {
    console.log(`Scene ${scene.order + 1}: ${scene.location}`)
    console.log(`  Description: "${scene.description}"`)
    
    // Decide inheritance
    const metadata = await backgroundManager.decideBackgroundInheritance(
      scene.description
    )
    
    const status = metadata.isInherited ? '🔄 INHERITED' : '🆕 NEW'
    console.log(`  ${status} - ID: ${metadata.id.slice(0, 8)}`)
    
    // Persist as plain text
    const result = await updateCardBackground(scene.cardId, metadata.description)
    
    results.push({
      scene: scene.order + 1,
      location: scene.location,
      inherited: metadata.isInherited,
      success: result.success,
    })
    
    console.log(`  ${result.success ? '✓' : '✗'} Persisted to database\n`)
  }
  
  console.log('--- Summary ---')
  console.log(`Total scenes: ${results.length}`)
  console.log(`Unique backgrounds: ${new Set(results.filter(r => !r.inherited).map(r => r.location)).size}`)
  console.log(`Inherited: ${results.filter(r => r.inherited).length}`)
  console.log(`New: ${results.filter(r => !r.inherited).length}`)
  console.log(`Success rate: ${(results.filter(r => r.success).length / results.length * 100).toFixed(0)}%`)
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🎬 Background JSON Integration Examples')
  console.log('========================================')
  
  try {
    await example1_updateSingleCard()
    await example2_integrateWithStoryboard()
    await example3_manualConversion()
    await example4_batchUpdate()
    await example5_fullPipeline()
    
    console.log('\n✅ All examples completed!')
  } catch (error) {
    console.error('\n❌ Example failed:', error)
  }
}

// Export individual examples
export {
  example1_updateSingleCard,
  example2_integrateWithStoryboard,
  example3_manualConversion,
  example4_batchUpdate,
  example5_fullPipeline,
}

// Uncomment to run:
// runAllExamples().catch(console.error)
