<?php
/**
 * FILE: app/Support/Clustering/DBSCAN.php
 *
 * Native replacement for Phpml\Clustering\DBSCAN (php-ai/php-ml package).
 *
 * WHY THIS EXISTS: php-ai/php-ml's Composer distribution depends on
 * GitLab being reachable and not rate-limiting the request, with an SSH
 * git clone as its only fallback. That's a real risk for any clean
 * `composer install` (fresh server, CI, redeploy without vendor/ already
 * present). The library was used for exactly one feature in this app -
 * AIService::fraudClusters() - already wrapped in a try/catch that
 * degrades gracefully. DBSCAN itself is a small, standard, well-documented
 * algorithm, so rather than manage around a fragile dependency for one
 * non-critical feature, it's reimplemented here natively. Zero new
 * dependencies, same interface, same behaviour.
 *
 * Usage (identical to the library it replaces):
 *   $dbscan = new DBSCAN(epsilon: 12, minSamples: 3);
 *   $clusters = $dbscan->cluster($samples);
 *   // $samples: array of numeric-array points, e.g. [[12.0, 4.5, 9], ...]
 *   // $clusters: array of clusters, each an array of the original point
 *   //            arrays that belong to it. Points that don't belong to
 *   //            any dense-enough region ("noise") are left out of the
 *   //            result entirely - same contract as the library this
 *   //            replaces, so AIService.php needed zero changes beyond
 *   //            the import line.
 *
 * Algorithm: standard DBSCAN (Ester et al., 1996) with Euclidean distance.
 * Not optimized with a spatial index (k-d tree) since fraud-flag batches
 * here are small (tens to low hundreds of points) - a full O(n^2) region
 * query is fast enough at this scale and keeps the implementation simple
 * and easy to audit.
 */
namespace App\Support\Clustering;

class DBSCAN
{
    private const NOISE = -1;
    private const UNVISITED = 0;

    public function __construct(
        private readonly float $epsilon,
        private readonly int $minSamples,
    ) {}

    /**
     * @param array<int, array<int, float|int>> $samples
     * @return array<int, array<int, array<int, float|int>>>
     */
    public function cluster(array $samples): array
    {
        $samples = array_values($samples);
        $count = count($samples);

        $labels = array_fill(0, $count, self::UNVISITED);
        $clusterId = 0;

        for ($i = 0; $i < $count; $i++) {
            if ($labels[$i] !== self::UNVISITED) {
                continue; // already assigned to a cluster or marked noise
            }

            $neighbors = $this->regionQuery($samples, $i);

            if (count($neighbors) < $this->minSamples) {
                $labels[$i] = self::NOISE;
                continue;
            }

            $clusterId++;
            $labels[$i] = $clusterId;
            $this->expandCluster($samples, $labels, $neighbors, $clusterId);
        }

        // Group original points by their final cluster id, dropping noise.
        $clusters = [];
        foreach ($labels as $index => $label) {
            if ($label === self::NOISE) {
                continue;
            }
            $clusters[$label][] = $samples[$index];
        }

        // Reindex from 0 so the return shape matches the library this
        // replaces exactly (callers iterate with foreach ($clusters as $i => $points)).
        return array_values($clusters);
    }

    /**
     * Grows a cluster outward from its seed neighborhood, absorbing any
     * point reachable through a chain of dense regions (density-connectivity,
     * the defining property of DBSCAN vs. simpler radius-based grouping).
     *
     * @param array<int, array<int, float|int>> $samples
     * @param array<int, int> $labels passed by reference, mutated in place
     * @param array<int, int> $seedIndexes
     */
    private function expandCluster(array $samples, array &$labels, array $seedIndexes, int $clusterId): void
    {
        $queue = $seedIndexes;

        while ($queue) {
            $current = array_shift($queue);

            if ($labels[$current] === self::NOISE) {
                $labels[$current] = $clusterId; // border point - reachable, but not a core point itself
                continue;
            }

            if ($labels[$current] !== self::UNVISITED) {
                continue; // already processed
            }

            $labels[$current] = $clusterId;

            $neighbors = $this->regionQuery($samples, $current);
            if (count($neighbors) >= $this->minSamples) {
                // $current is itself a core point - its neighborhood extends the cluster
                foreach ($neighbors as $n) {
                    if ($labels[$n] === self::UNVISITED || $labels[$n] === self::NOISE) {
                        $queue[] = $n;
                    }
                }
            }
        }
    }

    /**
     * All point indexes within epsilon distance of $samples[$pointIndex],
     * including the point itself.
     *
     * @param array<int, array<int, float|int>> $samples
     * @return array<int, int>
     */
    private function regionQuery(array $samples, int $pointIndex): array
    {
        $neighbors = [];
        $point = $samples[$pointIndex];

        foreach ($samples as $index => $candidate) {
            if ($this->euclideanDistance($point, $candidate) <= $this->epsilon) {
                $neighbors[] = $index;
            }
        }

        return $neighbors;
    }

    /**
     * @param array<int, float|int> $a
     * @param array<int, float|int> $b
     */
    private function euclideanDistance(array $a, array $b): float
    {
        $sum = 0.0;
        foreach ($a as $i => $value) {
            $diff = $value - ($b[$i] ?? 0);
            $sum += $diff * $diff;
        }
        return sqrt($sum);
    }
}
