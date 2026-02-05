// NetworkArchitectureDiagram.jsx
import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    CpuChipIcon,
    ServerIcon,
    ComputerDesktopIcon,
    GlobeAltIcon,
    BeakerIcon,
    ShieldCheckIcon,
    CubeIcon,
    CircleStackIcon,
    WrenchScrewdriverIcon,
    Squares2X2Icon,
    CloudIcon,
    ArrowsRightLeftIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

// Asset type to icon mapping
const assetIcons = {
    'DCS Controller': CpuChipIcon,
    'PLC': CpuChipIcon,
    'Safety PLC': ShieldCheckIcon,
    'HMI': ComputerDesktopIcon,
    'Historian Server': CircleStackIcon,
    'Network Switch': ArrowsRightLeftIcon,
    'Engineering Workstation': WrenchScrewdriverIcon,
    'SCADA Server': ServerIcon,
    'RTU': CubeIcon,
    'Firewall': ShieldCheckIcon,
    'Router': GlobeAltIcon,
    'Sensor': BeakerIcon,
    'Actuator': Squares2X2Icon,
    'VPN Gateway': CloudIcon,
    'Default': CpuChipIcon,
};

// Purdue Model layer definitions
const PURDUE_LAYERS = {
    'L0': { name: 'Level 0 - Process', color: '#3B82F6', yPosition: 100 },
    'L1': { name: 'Level 1 - Basic Control', color: '#10B981', yPosition: 300 },
    'L2': { name: 'Level 2 - Area Control', color: '#F59E0B', yPosition: 500 },
    'L3': { name: 'Level 3 - Site Operations', color: '#EF4444', yPosition: 700 },
    'L4': { name: 'Level 4 - Enterprise', color: '#8B5CF6', yPosition: 900 },
    'DMZ': { name: 'DMZ', color: '#EC4899', yPosition: 1100 },
};

// Protocol colors for edges
const PROTOCOL_COLORS = {
    'OPC UA': '#3B82F6',
    'Modbus TCP': '#10B981',
    'EtherNet/IP': '#F59E0B',
    'Profinet': '#EF4444',
    'OPC DA': '#8B5CF6',
    'RDP': '#EC4899',
    'SSH': '#06B6D4',
    'SQL': '#84CC16',
    'CIP': '#F97316',
    'Default': '#6B7280',
};

// Custom node component - wrapped with React.memo to prevent unnecessary re-renders
const CustomNode = React.memo(({ data }) => {
    const Icon = assetIcons[data.asset_type] || assetIcons.Default;
    const statusColor = {
        'Operational': 'bg-green-100 border-green-500 text-green-800',
        'Maintenance': 'bg-yellow-100 border-yellow-500 text-yellow-800',
        'Decommissioned': 'bg-gray-100 border-gray-500 text-gray-800',
        'Offline': 'bg-red-100 border-red-500 text-red-800',
        'Default': 'bg-blue-100 border-blue-500 text-blue-800',
    }[data.status] || 'bg-blue-100 border-blue-500 text-blue-800';

    const criticalityColor = {
        'Critical': 'bg-red-500',
        'High': 'bg-orange-500',
        'Medium': 'bg-yellow-500',
        'Low': 'bg-green-500',
    }[data.criticality] || 'bg-gray-500';

    return (
        <div className="px-4 py-3 shadow-lg rounded-xl border-2 bg-white" style={{ minWidth: '220px' }}>
            {/* Handles for connections */}
            <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-blue-500" />
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-500" />
            <Handle type="source" position={Position.Left} className="w-3 h-3 !bg-purple-500" />
            <Handle type="target" position={Position.Right} className="w-3 h-3 !bg-red-500" />

            {/* Node header */}
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${statusColor.split(' ')[0]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm truncate max-w-[180px]">{data.label}</h3>
                        <div className={`w-3 h-3 rounded-full ${criticalityColor}`} title={data.criticality} />
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">{data.asset_type}</p>
                </div>
            </div>

            {/* Node body */}
            <div className="space-y-1 text-xs">
                {data.ip_address && (
                    <div className="flex items-center gap-1">
                        <span className="text-gray-400">IP:</span>
                        <span className="font-mono truncate max-w-[120px]">{data.ip_address[0]}</span>
                        {data.ip_address.length > 1 && (
                            <span className="text-gray-400">+{data.ip_address.length - 1}</span>
                        )}
                    </div>
                )}
                {data.hostname && (
                    <div className="flex items-center gap-1">
                        <span className="text-gray-400">Host:</span>
                        <span className="truncate max-w-[120px]">{data.hostname}</span>
                    </div>
                )}
                {data.manufacturer && (
                    <div className="flex items-center gap-1">
                        <span className="text-gray-400">Vendor:</span>
                        <span className="truncate max-w-[120px]">{data.manufacturer}</span>
                    </div>
                )}
            </div>

            {/* Status badge */}
            <div className={`mt-2 px-2 py-1 rounded text-xs text-center border ${statusColor}`}>
                {data.status}
            </div>

            {/* Vulnerability indicator */}
            {data.vulnerabilities && data.vulnerabilities.length > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-xs text-red-600">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    <span>{data.vulnerabilities.length} CVE(s)</span>
                </div>
            )}
        </div>
    );
});

CustomNode.displayName = 'CustomNode';

// Custom edge component with protocol styling
const CustomEdge = ({ id, source, target, data, style = {} }) => {
    const protocol = data?.protocol || 'Default';
    const color = PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.Default;

    return {
        id,
        source,
        target,
        type: 'smoothstep',
        animated: data?.reliability === 'Critical',
        style: {
            stroke: color,
            strokeWidth: data?.reliability === 'Critical' ? 3 : 2,
            strokeDasharray: data?.security_level === 'None' ? '5,5' : 'none',
            ...style,
        },
        label: data?.protocol,
        labelStyle: {
            fill: color,
            fontWeight: 'bold',
            fontSize: '10px',
        },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.7 },
        markerEnd: {
            type: 'arrowclosed',
            color: color,
        },
    };
};

// Main component
const NetworkArchitectureDiagram = ({ assetRegister }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [viewMode, setViewMode] = useState('architecture');
    const [showVulnerabilities, setShowVulnerabilities] = useState(true);
    const [initialized, setInitialized] = useState(false);
    
    const reactFlowInstance = useRef(null);
    const resizeTimeout = useRef(null);
    const initialRender = useRef(true);

    // Debounced fit view function
    const debouncedFitView = useMemo(() => 
        debounce((instance) => {
            if (instance) {
                try {
                    instance.fitView({ padding: 0.2, duration: 100, maxZoom: 1.5 });
                } catch (error) {
                    // Ignore fitView errors during resizing
                    console.debug('FitView error during resize:', error);
                }
            }
        }, 300),
        []
    );

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (resizeTimeout.current) {
                clearTimeout(resizeTimeout.current);
            }
            debouncedFitView.cancel();
        };
    }, [debouncedFitView]);

    // Map zone to Purdue layer
    const zoneToLayer = useCallback((zone) => {
        if (!zone) return 'L2';
        const zoneStr = zone.toString();
        if (zoneStr.includes('Level 0') || zoneStr.includes('Process')) return 'L0';
        if (zoneStr.includes('Level 1') || zoneStr.includes('Basic Control')) return 'L1';
        if (zoneStr.includes('Level 2') || zoneStr.includes('Area Control')) return 'L2';
        if (zoneStr.includes('Level 3') || zoneStr.includes('Site Operations')) return 'L3';
        if (zoneStr.includes('Level 4') || zoneStr.includes('Enterprise')) return 'L4';
        if (zoneStr.includes('DMZ')) return 'DMZ';
        return 'L2';
    }, []);

    // Generate nodes from asset register
    const generateNodes = useCallback((data) => {
        if (!data?.assets) return [];

        // Group assets by Purdue layer
        const assetsByLayer = {
            'L0': [],
            'L1': [],
            'L2': [],
            'L3': [],
            'L4': [],
            'DMZ': [],
        };

        data.assets.forEach(asset => {
            const layer = zoneToLayer(asset.zone);
            assetsByLayer[layer].push(asset);
        });

        // Calculate positions
        const nodeWidth = 200;
        const nodeHeight = 150;
        const layerSpacing = 250;
        const nodeSpacing = 200;

        const nodes = [];

        Object.entries(assetsByLayer).forEach(([layerKey, layerAssets]) => {
            const layer = PURDUE_LAYERS[layerKey];
            const x = layerSpacing * (Object.keys(PURDUE_LAYERS).indexOf(layerKey) + 1);

            layerAssets.forEach((asset, index) => {
                const y = layer.yPosition + (index * nodeSpacing);

                nodes.push({
                    id: asset.asset_id,
                    type: 'custom',
                    position: { x, y },
                    data: {
                        label: asset.asset_name,
                        asset_type: asset.asset_type,
                        manufacturer: asset.manufacturer,
                        ip_address: asset.ip_address,
                        hostname: asset.hostname,
                        status: asset.status,
                        criticality: asset.criticality,
                        vulnerabilities: asset.vulnerabilities,
                        zone: asset.zone,
                        fullData: asset,
                    },
                    style: {
                        borderColor: layer.color,
                        borderWidth: '2px',
                        opacity: viewMode === 'security' && asset.vulnerabilities?.length > 0 && showVulnerabilities ? 1 : 0.8,
                        width: '220px',
                    },
                });
            });
        });

        return nodes;
    }, [zoneToLayer, viewMode, showVulnerabilities]);

    // Generate edges from connections
    const generateEdges = useCallback((data) => {
        if (!data?.connections) return [];

        return data.connections.map(conn => {
            const protocol = conn.protocol || 'Default';
            const color = PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.Default;

            // Find source and target nodes to determine layer positions
            const sourceAsset = data.assets.find(a => a.asset_id === conn.source_asset_id);
            const targetAsset = data.assets.find(a => a.asset_id === conn.destination_asset_id);

            const sourceLayer = zoneToLayer(sourceAsset?.zone);
            const targetLayer = zoneToLayer(targetAsset?.zone);

            // Different styling for cross-layer connections
            const isCrossLayer = sourceLayer !== targetLayer;
            const isCritical = conn.reliability === 'Critical';
            const isUnsecure = conn.security_level === 'None';

            return CustomEdge({
                id: conn.connection_id,
                source: conn.source_asset_id,
                target: conn.destination_asset_id,
                data: {
                    protocol: conn.protocol,
                    port: conn.port,
                    reliability: conn.reliability,
                    security_level: conn.security_level,
                    bandwidth: conn.bandwidth,
                    latency: conn.latency,
                    fullData: conn,
                },
                style: {
                    stroke: isCrossLayer ? '#7C3AED' : color,
                    strokeWidth: isCritical ? 4 : 2,
                    strokeDasharray: isUnsecure ? '5,5' : 'none',
                },
            });
        });
    }, [zoneToLayer]);

    // Initialize diagram - with debounce and proper cleanup
    useEffect(() => {
        if (!assetRegister) return;

        const initializeDiagram = () => {
            const assetNodes = generateNodes(assetRegister);
            const allEdges = generateEdges(assetRegister);

            setNodes(assetNodes);
            setEdges(allEdges);
            
            // Fit view after a short delay to allow DOM to settle
            if (reactFlowInstance.current && initialRender.current) {
                initialRender.current = false;
                setTimeout(() => {
                    if (reactFlowInstance.current) {
                        try {
                            reactFlowInstance.current.fitView({ 
                                padding: 0.2, 
                                duration: 100,
                                maxZoom: 1.5 
                            });
                        } catch (error) {
                            console.debug('Initial fitView error:', error);
                        }
                    }
                }, 100);
            }
            
            setInitialized(true);
        };

        // Clear any pending timeouts
        if (resizeTimeout.current) {
            clearTimeout(resizeTimeout.current);
        }

        // Debounce initialization to prevent rapid successive updates
        resizeTimeout.current = setTimeout(initializeDiagram, 50);

        return () => {
            if (resizeTimeout.current) {
                clearTimeout(resizeTimeout.current);
            }
        };
    }, [assetRegister, generateNodes, generateEdges, setNodes, setEdges]);

    // Handle view mode changes
    useEffect(() => {
        if (initialized && reactFlowInstance.current) {
            debouncedFitView(reactFlowInstance.current);
        }
    }, [viewMode, showVulnerabilities, initialized, debouncedFitView]);

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const onNodeClick = useCallback((event, node) => {
        setSelectedNode(node);
        setSelectedEdge(null);
    }, []);

    const onEdgeClick = useCallback((event, edge) => {
        setSelectedEdge(edge);
        setSelectedNode(null);
    }, []);

    const onInit = useCallback((instance) => {
        reactFlowInstance.current = instance;
        
        // Only fit view on initial load
        if (initialRender.current && nodes.length > 0) {
            setTimeout(() => {
                if (instance && initialRender.current) {
                    try {
                        instance.fitView({ 
                            padding: 0.2, 
                            duration: 100,
                            maxZoom: 1.5 
                        });
                    } catch (error) {
                        console.debug('onInit fitView error:', error);
                    }
                    initialRender.current = false;
                }
            }, 150);
        }
    }, [nodes.length]);

    const nodeTypes = useMemo(() => ({
        custom: CustomNode,
    }), []);

    return (
        <div className="flex flex-1 bg-gray-50" style={{ minHeight: 0 }}>
            {/* Main diagram area */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onInit={onInit}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    nodeTypes={nodeTypes}
                    fitView={false} // Disable auto fitView to prevent resize loops
                    minZoom={0.1}
                    maxZoom={2}
                    className="bg-gradient-to-br from-gray-50 to-gray-100"
                    nodesDraggable={true}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    selectNodesOnDrag={false}
                    preventScrolling={true}
                >
                    <Controls />
                    <MiniMap
                        nodeStrokeColor={(n) => {
                            if (n.data?.criticality === 'Critical') return '#EF4444';
                            if (n.data?.criticality === 'High') return '#F59E0B';
                            if (n.data?.criticality === 'Medium') return '#3B82F6';
                            return '#10B981';
                        }}
                        nodeColor={(n) => {
                            const layer = zoneToLayer(n.data?.zone);
                            return PURDUE_LAYERS[layer]?.color || '#6B7280';
                        }}
                        pannable={true}
                        zoomable={true}
                    />
                    <Background variant="dots" gap={12} size={1} />

                    {/* Purdue Model Legend */}
                    <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
                        <h3 className="font-bold text-lg mb-2 text-gray-800">Purdue Model Layers</h3>
                        <div className="space-y-2">
                            {Object.entries(PURDUE_LAYERS).map(([key, layer]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: layer.color }}
                                    />
                                    <span className="text-sm text-gray-700">{layer.name}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* Protocol Legend */}
                    <Panel position="top-right" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4">
                        <h3 className="font-bold text-lg mb-2 text-gray-800">Protocols</h3>
                        <div className="space-y-2">
                            {Object.entries(PROTOCOL_COLORS).map(([protocol, color]) => (
                                <div key={protocol} className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-sm text-gray-700">{protocol}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* Controls */}
                    <Panel position="bottom-left" className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setViewMode('architecture')}
                            className={`px-4 py-2 rounded-lg ${viewMode === 'architecture'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                                }`}
                        >
                            Architecture View
                        </button>
                        <button
                            onClick={() => setViewMode('security')}
                            className={`px-4 py-2 rounded-lg ${viewMode === 'security'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                                }`}
                        >
                            Security View
                        </button>
                        {viewMode === 'security' && (
                            <button
                                onClick={() => setShowVulnerabilities(!showVulnerabilities)}
                                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${showVulnerabilities
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                    }`}
                            >
                                {showVulnerabilities ? (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Vulnerabilities Shown
                                    </>
                                ) : (
                                    <>
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                        Show Vulnerabilities
                                    </>
                                )}
                            </button>
                        )}
                    </Panel>
                </ReactFlow>
            </div>

            {/* Side panel for details */}
            <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
                {selectedNode ? (
                    <NodeDetailsPanel node={selectedNode} />
                ) : selectedEdge ? (
                    <EdgeDetailsPanel edge={selectedEdge} />
                ) : (
                    <div className="p-6">
                        <div className="text-center text-gray-500">
                            <CubeIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-semibold mb-2">No Selection</h3>
                            <p className="text-sm">Click on any asset or connection to view details</p>
                        </div>

                        {/* Site overview */}
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">Site Overview</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Assets:</span>
                                    <span className="font-semibold">{assetRegister?.assets?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Connections:</span>
                                    <span className="font-semibold">{assetRegister?.connections?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Site:</span>
                                    <span className="font-semibold">{assetRegister?.metadata?.site_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Node Details Panel Component
const NodeDetailsPanel = ({ node }) => {
    const data = node.data?.fullData || node.data;
    const Icon = assetIcons[data.asset_type] || assetIcons.Default;

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                    <Icon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{data.asset_name}</h2>
                    <p className="text-sm text-gray-500">{data.asset_type} • {data.manufacturer}</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Status and Criticality */}
                <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg ${data.status === 'Operational' ? 'bg-green-50 border border-green-200' :
                        data.status === 'Maintenance' ? 'bg-yellow-50 border border-yellow-200' :
                            'bg-red-50 border border-red-200'
                        }`}>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{data.status}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${data.criticality === 'Critical' ? 'bg-red-50 border border-red-200' :
                        data.criticality === 'High' ? 'bg-orange-50 border border-orange-200' :
                            data.criticality === 'Medium' ? 'bg-yellow-50 border border-yellow-200' :
                                'bg-green-50 border border-green-200'
                        }`}>
                        <p className="text-sm text-gray-600">Criticality</p>
                        <p className="font-semibold">{data.criticality}</p>
                    </div>
                </div>

                {/* Network Information */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Network Information</h3>
                    <div className="space-y-2">
                        {data.ip_address?.map((ip, index) => (
                            <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">IP Address {index + 1}:</span>
                                <span className="font-mono text-sm">{ip}</span>
                            </div>
                        ))}
                        {data.hostname && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">Hostname:</span>
                                <span className="font-semibold text-sm">{data.hostname}</span>
                            </div>
                        )}
                        {data.mac_address?.map((mac, index) => (
                            <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-600">MAC {index + 1}:</span>
                                <span className="font-mono text-sm">{mac}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Protocols */}
                {data.protocols && data.protocols.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-3">Protocols</h3>
                        <div className="flex flex-wrap gap-2">
                            {data.protocols.map((protocol, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: `${PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.Default}20`,
                                        color: PROTOCOL_COLORS[protocol] || PROTOCOL_COLORS.Default,
                                    }}
                                >
                                    {protocol}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vulnerabilities */}
                {data.vulnerabilities && data.vulnerabilities.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            Vulnerabilities ({data.vulnerabilities.length})
                        </h3>
                        <div className="space-y-2">
                            {data.vulnerabilities.map((cve, index) => (
                                <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <p className="font-mono text-sm font-semibold text-red-800">{cve}</p>
                                    <p className="text-xs text-red-600 mt-1">High priority - Immediate action required</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Additional Information */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Additional Information</h3>
                    <div className="space-y-2">
                        {data.description && (
                            <div className="p-3 bg-gray-50 rounded">
                                <p className="text-sm text-gray-600 mb-1">Description</p>
                                <p className="text-sm">{data.description}</p>
                            </div>
                        )}
                        {data.location && (
                            <div className="flex justify-between p-2">
                                <span className="text-sm text-gray-600">Location:</span>
                                <span className="font-semibold text-sm">{data.location}</span>
                            </div>
                        )}
                        {data.last_patch_date && (
                            <div className="flex justify-between p-2">
                                <span className="text-sm text-gray-600">Last Patch:</span>
                                <span className="font-semibold text-sm">{data.last_patch_date}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Edge Details Panel Component
const EdgeDetailsPanel = ({ edge }) => {
    const data = edge.data?.fullData || edge.data;

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-lg">
                    <ArrowsRightLeftIcon className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Connection Details</h2>
                    <p className="text-sm text-gray-500">{data.protocol} Connection</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Connection Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Protocol</p>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: PROTOCOL_COLORS[data.protocol] || PROTOCOL_COLORS.Default }}
                                />
                                <p className="font-semibold">{data.protocol}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Port</p>
                            <p className="font-semibold">{data.port}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Reliability</p>
                            <p className={`font-semibold ${data.reliability === 'Critical' ? 'text-red-600' :
                                data.reliability === 'High' ? 'text-green-600' :
                                    'text-yellow-600'
                                }`}>
                                {data.reliability}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Security Level</p>
                            <p className={`font-semibold ${data.security_level === 'None' ? 'text-red-600' :
                                data.security_level === 'Authenticated' ? 'text-green-600' :
                                    'text-yellow-600'
                                }`}>
                                {data.security_level || 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                {(data.bandwidth || data.latency) && (
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-3">Performance</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {data.bandwidth && (
                                <div className="p-3 bg-blue-50 rounded">
                                    <p className="text-sm text-gray-600">Bandwidth</p>
                                    <p className="font-semibold">{data.bandwidth}</p>
                                </div>
                            )}
                            {data.latency && (
                                <div className="p-3 bg-green-50 rounded">
                                    <p className="text-sm text-gray-600">Latency</p>
                                    <p className="font-semibold">{data.latency}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Security Assessment */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Security Assessment</h3>
                    <div className="space-y-3">
                        <div className={`p-3 rounded-lg ${data.security_level === 'None' ? 'bg-red-50 border border-red-200' :
                            data.security_level === 'Authenticated' ? 'bg-green-50 border border-green-200' :
                                'bg-yellow-50 border border-yellow-200'
                            }`}>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Encryption</span>
                                <span className={`px-2 py-1 rounded text-xs ${data.security_level === 'None' ? 'bg-red-100 text-red-800' :
                                    data.security_level === 'Authenticated' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {data.security_level === 'None' ? 'Unsecured' : 'Secured'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {data.security_level === 'None'
                                    ? 'This connection lacks encryption. Consider implementing TLS.'
                                    : 'Connection uses proper authentication and encryption.'}
                            </p>
                        </div>

                        <div className={`p-3 rounded-lg ${data.reliability === 'Critical' ? 'bg-red-50 border border-red-200' :
                            data.reliability === 'High' ? 'bg-green-50 border border-green-200' :
                                'bg-yellow-50 border border-yellow-200'
                            }`}>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Reliability</span>
                                <span className={`px-2 py-1 rounded text-xs ${data.reliability === 'Critical' ? 'bg-red-100 text-red-800' :
                                    data.reliability === 'High' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {data.reliability}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {data.reliability === 'Critical'
                                    ? 'Critical connection. Redundancy recommended.'
                                    : 'Connection meets reliability requirements.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {data.security_level === 'None' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            Security Recommendation
                        </h4>
                        <p className="text-sm text-red-700">
                            This connection lacks security controls. Implement TLS encryption and
                            authentication mechanisms to prevent MITM attacks.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkArchitectureDiagram;