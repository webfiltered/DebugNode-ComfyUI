import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

const hardLimit = 100

// Does most of the regular textarea cleanup, but leaks a ref in domWidget.js -> elementWidgets until the node is removed
function removeWidget(node, widget) {
    widget.onRemove?.()
    const index = node.widgets.indexOf(widget)
    if (index !== -1)
        node.widgets.splice(index, 1)
}

function removeAllWidgets(node) {
    for (const widget of node.widgets) {
        widget.onRemove?.()
    }
    node.widgets.length = 0
}

// Main logic
app.registerExtension({
    name: "WTFDebugNode",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "WTFDebugNode") {

            const origOnExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function (message) {
                const r = origOnExecuted
                    ? origOnExecuted?.apply(this, arguments)
                    : undefined

                // Because debug
                console.log(message)

                // Sanity init
                this.widgets ??= []
                this.serialize_widgets = false
                const baseOpacity = app.canvas.editor_alpha

                // Clear if invalid
                const itemsLength = parseInt(message?.items?.length)
                if (isNaN(itemsLength)) {
                    removeAllWidgets(this)
                    return r
                }

                const isMultiItem = itemsLength > 1
                const wasMultiItem = this.debugNodeLength !== 1

                // Clean up existing widgets if required
                if (isMultiItem !== wasMultiItem) {
                    removeAllWidgets(this)
                }
                // Remove only widgets we can't reuse
                else if (this.debugNodeLength > itemsLength) {
                    for (let i = itemsLength; i <= this.debugNodeLength; i++) {
                        for (const widget of this.widgets.filter(x => x.name.endsWith(` ${i}`))) {
                            removeWidget(this, widget)
                        }
                    }
                }

                this.debugNodeLength = itemsLength
                const maxItems = Math.min(itemsLength, hardLimit)

                // Create / update widget values for each item
                for (let i = 0; i < maxItems; i++) {
                    const item = message.items[i]
                    const type = item.type
                    const len = item.len
                    const shape = item.shape
                    const firstIterItem = item.firstIterItem
                    const value = item.value

                    function processWidget(node, name, value, isMultiline = false) {
                        const numberedName = isMultiItem
                            ? `${name} ${i}`
                            : name
                        const comfyType = isMultiline
                            ? ["STRING", { multiline: true }]
                            : "STRING"

                        const current = node.widgets.find(x => x.name === numberedName)
                        const widget = current ?? ComfyWidgets.STRING(node, numberedName, comfyType, app).widget

                        if (!widget.options)
                            widget.options = {}
                        widget.options.serialize = false
                        widget.value = value
                        widget.disabled = value === null || value === undefined
                        if (isMultiline) {
                            widget.element.style.opacity = widget.disabled
                                ? baseOpacity * 0.5
                                : baseOpacity
                        }
                    }

                    processWidget(this, "type", type)
                    processWidget(this, "len()", len)
                    processWidget(this, "shape", shape)
                    processWidget(this, "type of first iter() item", firstIterItem)
                    processWidget(this, "value", value, true)
                }

                requestAnimationFrame(() => {
                    this.onResize?.(this.size)
                })

                return r
            }
        }
    },
});
