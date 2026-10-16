import { setWorkerUrl } from 'maplibre-gl';
// The worker needs `?worker&url` because a plain `?url` drops the shared chunk it imports
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
