module.exports = function(RED) {
    function DeltaMBReadNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // parse start/end: octal only for X/Y
        const parseAddr = (str) => {
            if (str === "" || str == null) return null;
            return ['X','Y'].includes(node.device)
                ? parseInt(str, 8)
                : parseInt(str, 10);
        };

        // config
        node.device = config.device;
        node.stationId = Number(config.stationId);
        node.start = parseAddr(config.start);
        node.end = config.end !== "" ? parseAddr(config.end) : null;
        node.baseOffset = parseInt(config.baseOffset, 10);

        // base address & FC per device
        const baseMap = {
            X: 1025,
            Y: 1281,
            M: 2049,
            D16: 4097,
            D32: 4097,
            T: 1537,
            C16: 3585,
            C32: 1793
        };
        const fcMap = {
            X: 2, Y: 1, M: 1,
            D16: 3, D32: 3, T: 3,
            C16: 3, C32: 3
        };

        node.on('input', function(msg) {
            const base = baseMap[node.device] || 0;
            const fc = fcMap[node.device] || 3;
            const stationId = node.stationId || 1;

            // Calculate starting address
            let addr0;
            if (node.device === 'C32') {
                addr0 = base + (node.start - 200) + node.baseOffset;
            } else {
                addr0 = base + node.start + node.baseOffset;
            }

            // Calculate end address
            let endAddr;
            if (node.end !== null) {
                if (node.device === 'C32') {
                    endAddr = base + (node.end - 200) + node.baseOffset;
                } else {
                    endAddr = base + node.end + node.baseOffset;
                }
            } else {
                endAddr = addr0;
            }

            let quantity = endAddr >= addr0
                ? (endAddr - addr0 + 1)
                : 1;

            // For 32-bit devices, 1 unit = 2 registers
            if (['D32','C32'].includes(node.device)) {
                quantity = quantity * 2;
            }

            msg.payload = {
                value: [],
                fc: fc,
                unitid: stationId,
                address: addr0,
                quantity: quantity
            };
            node.send(msg);
        });
    }

    RED.nodes.registerType('DELTA-READ', DeltaMBReadNode);
};