/**
 * One-shot CLI runner for the recommendation recompute — the same logic the
 * cron job calls periodically, runnable on demand:
 *   npm run recommendations:compute
 */
import { recomputeAllUserScores } from '@services/recommendation/engine';
import { disconnectDatabase } from '@config/database';

async function main() {
  console.log('Recomputing recommendation scores for all users...');
  const summary = await recomputeAllUserScores();
  console.log(
    `Done. Processed ${summary.usersProcessed} users against a ${summary.candidatePoolSize}-track candidate pool.`
  );
}

main()
  .catch((err) => {
    console.error('Recompute failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
