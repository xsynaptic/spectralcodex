import { setWorkerUrl } from 'maplibre-gl';
// `?worker&url` not `?url`; the dist worker imports maplibre-gl-shared.mjs, which `?url` drops
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
