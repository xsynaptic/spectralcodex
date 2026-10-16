const clusterHoverIdPrefix = 'cluster-';

export function getClusterHoverId(clusterId: number) {
	return `${clusterHoverIdPrefix}${String(clusterId)}`;
}

export function isClusterHoverId(id: string) {
	return id.startsWith(clusterHoverIdPrefix);
}
