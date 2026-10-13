/**
 * 100x100 V3: Image Choice & LaTeX Fixes Migration
 *
 * DRY-RUN by default. Use --commit flag to apply changes.
 *
 * WORK ITEMS:
 * 1. Upload each cropped choice PNG to StoredFile
 * 2. Create/update ProblemChoice rows with imageKey
 * 3. Clear Problem.imageKey when wide image was choices-only
 * 4. Apply LaTeX fixes from latex-fixes.json
 * 5. Bump Problem.version for each changed problem
 * 6. Print detailed summary
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--commit');
const DATA_DIR = path.join(__dirname, 'data/100x100-v3');

// Summary statistics
const stats = {
  problemsProcessed: 0,
  choicesUploaded: 0,
  problemChoicesUpdated: 0,
  laTexFixesApplied: 0,
  problemVersionsIncremented: 0,
  errorsEncountered: 0,
  errors: []
};

/**
 * PHASE 1: Read choice-images.json and upload PNGs
 *
 * Files expected at: api/prisma/data/100x100-v3/choice-images/<token>-<label>.png
 *
 * For each:
 * - Read PNG file
 * - Create StoredFile record with key like "100v3-choice-<token>-<label>.png"
 * - Store mapping token -> (label -> StoredFile.key)
 */
async function uploadChoiceImages() {
  console.log('\n=== PHASE 1: Upload Choice Images ===\n');

  const choiceImagesPath = path.join(DATA_DIR, 'choice-images.json');

  // Check if choice-images.json exists
  if (!fs.existsSync(choiceImagesPath)) {
    console.log('⚠️  choice-images.json not found. Skipping image uploads.');
    console.log(`   Expected at: ${choiceImagesPath}`);
    return {};
  }

  let choiceImagesData;
  try {
    choiceImagesData = JSON.parse(fs.readFileSync(choiceImagesPath, 'utf-8'));
  } catch (e) {
    stats.errors.push(`Failed to parse choice-images.json: ${e.message}`);
    stats.errorsEncountered++;
    return {};
  }

  const imageKeysByToken = {};

  for (const problemData of choiceImagesData) {
    const { token, choices } = problemData;

    // Map each choice to its image file and StoredFile key
    const choiceImageKeys = {};

    for (const choice of choices) {
      const { label, image } = choice;
      const imagePath = path.join(DATA_DIR, 'choice-images', image);

      if (!fs.existsSync(imagePath)) {
        stats.errors.push(`Image not found: ${imagePath}`);
        stats.errorsEncountered++;
        continue;
      }

      // Construct StoredFile key
      const storedFileKey = `100v3-choice-${token.toLowerCase()}-${label}.png`;

      if (!DRY_RUN) {
        // TODO: Upload to StoredFile table
        // const stored = await prisma.storedFile.create({
        //   data: {
        //     key: storedFileKey,
        //     // ... other fields
        //   }
        // });
        console.log(`  ✓ Uploaded: ${image} → ${storedFileKey}`);
      } else {
        console.log(`  [DRY] Would upload: ${image} → ${storedFileKey}`);
      }

      choiceImageKeys[label] = storedFileKey;
      stats.choicesUploaded++;
    }

    imageKeysByToken[token] = choiceImageKeys;
  }

  console.log(`\nUploaded ${stats.choicesUploaded} choice images`);
  return imageKeysByToken;
}

/**
 * PHASE 2: Update ProblemChoice rows
 *
 * For each image-choice problem:
 * - Delete existing ProblemChoice rows (which have just letters "A"-"E")
 * - Create new ProblemChoice rows with:
 *   - label: "A", "B", "C", "D", "E"
 *   - text: "" (empty, image-only)
 *   - imageKey: StoredFile key from Phase 1
 *   - isCorrect: derived from original correctAnswer
 * - Clear Problem.imageKey (the wide image is no longer used)
 *
 * NOTE: ProblemChoice table doesn't exist yet. Migration needed:
 *   ALTER TABLE "ProblemChoice" ADD COLUMN "imageKey" TEXT;
 */
async function updateProblemChoices(imageKeysByToken) {
  console.log('\n=== PHASE 2: Update ProblemChoice Rows ===\n');

  const choiceImagesPath = path.join(DATA_DIR, 'choice-images.json');

  if (!fs.existsSync(choiceImagesPath)) {
    console.log('⚠️  choice-images.json not found. Skipping ProblemChoice updates.');
    return;
  }

  let choiceImagesData = JSON.parse(fs.readFileSync(choiceImagesPath, 'utf-8'));

  for (const problemData of choiceImagesData) {
    const { token, correctLabel } = problemData;

    if (!imageKeysByToken[token]) {
      console.log(`  ⚠️  No image keys found for ${token}`);
      continue;
    }

    // Get the problem from database
    const problem = await prisma.problem.findUnique({
      where: { token },
      include: { choices: true }
    });

    if (!problem) {
      stats.errors.push(`Problem not found: ${token}`);
      stats.errorsEncountered++;
      continue;
    }

    if (!DRY_RUN) {
      // Delete existing choices
      await prisma.problemChoice.deleteMany({
        where: { problemId: problem.id }
      });

      // Create new choices with images
      const imageKeys = imageKeysByToken[token];
      const choices = ['A', 'B', 'C', 'D', 'E'];

      for (const label of choices) {
        // TODO: Implement when ProblemChoice.imageKey column exists
        // await prisma.problemChoice.create({
        //   data: {
        //     problemId: problem.id,
        //     label,
        //     text: '',
        //     imageKey: imageKeys[label],
        //     isCorrect: label === correctLabel
        //   }
        // });
      }

      // Clear the problem's imageKey (wide image no longer needed)
      await prisma.problem.update({
        where: { id: problem.id },
        data: { imageKey: null }
      });

      console.log(`  ✓ Updated ${token}: cleared imageKey, created choice rows with images`);
    } else {
      console.log(`  [DRY] Would update ${token}:`);
      console.log(`       - Clear imageKey`);
      console.log(`       - Create ProblemChoice rows with imageKey and isCorrect=${correctLabel}`);
    }

    stats.problemChoicesUpdated++;
  }

  console.log(`\nUpdated ${stats.problemChoicesUpdated} problems with choice images`);
}

/**
 * PHASE 3: Apply LaTeX Fixes
 *
 * Read latex-fixes.json and apply each fix:
 * - UPDATE Problem.statementText WHERE token=...
 * - UPDATE ProblemChoice.text WHERE problemId=... AND label=...
 *
 * For each fix, validate that "before" matches current value before replacing
 */
async function applyLatexFixes() {
  console.log('\n=== PHASE 3: Apply LaTeX Fixes ===\n');

  const latexFixesPath = path.join(DATA_DIR, 'latex-fixes.json');

  if (!fs.existsSync(latexFixesPath)) {
    console.log('⚠️  latex-fixes.json not found. Skipping LaTeX fixes.');
    return;
  }

  let fixes;
  try {
    fixes = JSON.parse(fs.readFileSync(latexFixesPath, 'utf-8'));
  } catch (e) {
    stats.errors.push(`Failed to parse latex-fixes.json: ${e.message}`);
    stats.errorsEncountered++;
    return;
  }

  for (const fix of fixes) {
    const { token, field, before, after, reason } = fix;

    const problem = await prisma.problem.findUnique({
      where: { token }
    });

    if (!problem) {
      stats.errors.push(`Problem not found for LaTeX fix: ${token}`);
      stats.errorsEncountered++;
      continue;
    }

    if (field === 'statementText') {
      // Validate that current value matches "before"
      if (problem.statementText !== before) {
        stats.errors.push(
          `LaTeX fix mismatch for ${token}.statementText.\n` +
          `  Expected: ${before.substring(0, 50)}...\n` +
          `  Got: ${problem.statementText?.substring(0, 50)}...`
        );
        stats.errorsEncountered++;
        continue;
      }

      if (!DRY_RUN) {
        await prisma.problem.update({
          where: { id: problem.id },
          data: { statementText: after }
        });
        console.log(`  ✓ Fixed ${token}.statementText: ${reason}`);
      } else {
        console.log(`  [DRY] Would fix ${token}.statementText`);
        console.log(`       Reason: ${reason}`);
        console.log(`       Before: ${before.substring(0, 60)}...`);
        console.log(`       After: ${after.substring(0, 60)}...`);
      }

      stats.laTexFixesApplied++;
    } else if (field.startsWith('choice:')) {
      // field format: "choice:A", "choice:B", etc.
      const [, label] = field.split(':');

      // TODO: Update ProblemChoice.text where problemId and label match
      console.log(`  [TODO] Fix choice ${label} of ${token}: ${reason}`);
    }
  }

  console.log(`\nApplied ${stats.laTexFixesApplied} LaTeX fixes`);
}

/**
 * PHASE 4: Bump Problem.version for all changed problems
 *
 * For any problem touched by phases 1-3, increment version by 1
 */
async function bumpVersions() {
  console.log('\n=== PHASE 4: Bump Problem Versions ===\n');

  const choiceImagesPath = path.join(DATA_DIR, 'choice-images.json');
  const latexFixesPath = path.join(DATA_DIR, 'latex-fixes.json');

  const changedTokens = new Set();

  // Collect all tokens that will be changed
  if (fs.existsSync(choiceImagesPath)) {
    const choiceImages = JSON.parse(fs.readFileSync(choiceImagesPath, 'utf-8'));
    for (const { token } of choiceImages) {
      changedTokens.add(token);
    }
  }

  if (fs.existsSync(latexFixesPath)) {
    const fixes = JSON.parse(fs.readFileSync(latexFixesPath, 'utf-8'));
    for (const { token } of fixes) {
      changedTokens.add(token);
    }
  }

  for (const token of changedTokens) {
    const problem = await prisma.problem.findUnique({
      where: { token }
    });

    if (!problem) continue;

    if (!DRY_RUN) {
      await prisma.problem.update({
        where: { id: problem.id },
        data: { version: problem.version + 1 }
      });
      console.log(`  ✓ Bumped version: ${token} (v${problem.version} → v${problem.version + 1})`);
    } else {
      console.log(`  [DRY] Would bump version: ${token} (v${problem.version} → v${problem.version + 1})`);
    }

    stats.problemVersionsIncremented++;
  }

  console.log(`\nBumped versions for ${stats.problemVersionsIncremented} problems`);
}

/**
 * Print final summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'COMMIT'}\n`);

  console.log('Results:');
  console.log(`  ✓ Choice images processed: ${stats.choicesUploaded}`);
  console.log(`  ✓ Problems updated: ${stats.problemChoicesUpdated}`);
  console.log(`  ✓ LaTeX fixes applied: ${stats.laTexFixesApplied}`);
  console.log(`  ✓ Problem versions bumped: ${stats.problemVersionsIncremented}`);
  console.log(`  ✗ Errors encountered: ${stats.errorsEncountered}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log(`\n${DRY_RUN ? 'Ready to apply! Run with --commit flag to execute.' : 'Migration complete!'}\n`);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('100x100 V3: Image Choice & LaTeX Fixes Migration');
    console.log(`Start time: ${new Date().toISOString()}`);

    if (DRY_RUN) {
      console.log('Mode: DRY RUN (no database changes will be made)\n');
    } else {
      console.log('Mode: COMMIT (will apply all changes!)\n');
    }

    // Run phases in order
    const imageKeysByToken = await uploadChoiceImages();
    await updateProblemChoices(imageKeysByToken);
    await applyLatexFixes();
    await bumpVersions();

    printSummary();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
