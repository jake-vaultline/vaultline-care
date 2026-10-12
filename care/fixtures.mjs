// Vaultline Care addition, Apache-2.0. All records below are synthetic.
export const identities = {
  "demo-north": {
    id: "demo-north",
    name: "North Studio client",
    tenantId: "north",
    role: "client",
    deployments: ["north-edit"],
  },
  "demo-south": {
    id: "demo-south",
    name: "South House client",
    tenantId: "south",
    role: "client",
    deployments: ["south-edit"],
  },
  "demo-jake": {
    id: "demo-jake",
    name: "Jake · demo operator",
    tenantId: null,
    role: "operator",
    deployments: ["north-edit", "south-edit"],
  },
};

export const profiles = [
  {
    id: "north-edit",
    tenantId: "north",
    name: "North Studio",
    label: "Editing room",
    synthetic: true,
    reference: "synthetic:north-edit",
    version: "Media Nexus 1.0.155",
    modules: ["Archive", "Relay", "Support"],
    hardware: "Mac mini · Apple M2 · 16 GB",
    storage: "Studio RAID · 8 TB / Destination NAS · 12 TB",
    tools: ["transfer_status", "destination_status", "diagnostic_log"],
    permissions: ["demo.reconnect_destination"],
    transfer: {
      id: "north-transfer-01",
      name: "Autumn campaign",
      status: "stalled",
      progress: 42,
      revision: 1,
      blocker: "destination_offline",
      destinationOnline: false,
      freeGb: 780,
    },
    docs: [
      {
        id: "north-relay-guide",
        title: "North Studio · stalled transfers",
        revision: "demo-1",
        content:
          "Synthetic deployment guide. The Destination NAS is a dedicated copy target. If Relay reports destination_offline and storage has space, check its connection. Reconnect the demo destination and resume from the saved checkpoint. Existing files stay in place; no restart from zero. A running transfer is recovery evidence, not proof of completion.",
      },
    ],
  },
  {
    id: "south-edit",
    tenantId: "south",
    name: "South House",
    label: "Production office",
    synthetic: true,
    reference: "synthetic:south-edit",
    version: "Media Nexus 1.0.154",
    modules: ["Archive", "Relay", "Support"],
    hardware: "Mac Studio · Apple M2 Max · 32 GB",
    storage: "Field SSD · 4 TB / Delivery RAID · 16 TB",
    tools: ["transfer_status", "destination_status"],
    permissions: [],
    transfer: {
      id: "south-transfer-01",
      name: "Winter launch",
      status: "stalled",
      progress: 68,
      revision: 1,
      blocker: "destination_full",
      destinationOnline: true,
      freeGb: 0,
    },
    docs: [
      {
        id: "south-relay-guide",
        title: "South House · destination capacity",
        revision: "demo-1",
        content:
          "Synthetic deployment guide. Delivery RAID is the delivery target. When destination_full is reported, retrying does not make room. Ask Jake to review capacity or choose another approved destination. Never delete media to free space without exact owner authorization and a verified backup. Diagnostic log access is not configured for this deployment.",
      },
    ],
  },
];
