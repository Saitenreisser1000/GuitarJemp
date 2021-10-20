<template>
    <vue-draggable-resizable
            class="dragBox"
            :class="{isFocused: dot.isFocused}"

            :onDragStart="onDragStartCallback"
            @dragstop="dragStop"

            axis="x"

            :onResizeStart="onResizeStartCallback"
            @resizestop="resizeStop"

            :handles="['mr']"
            :parent="true"

            :grid="[10,5]"
            :min-width="10"
            :max-width="200"

            :h="40"
            :w=boxWidth
            :x=xPos
            :y=yPos
    >
    </vue-draggable-resizable>
</template>

<script>
    import Vue from 'vue'
    import VueDraggableResizable from 'vue-draggable-resizable'
    import 'vue-draggable-resizable/dist/VueDraggableResizable.css'

    Vue.component('vue-draggable-resizable', VueDraggableResizable);

    export default {
        props: ['xPos', 'yPos', 'newkey', 'boxWidth', 'strNr', 'dot'],
        data: function () {
            return {
                dragStartValues: {},
            }
        },

        methods: {
            onDragStartCallback: function(){
                this.dragResizeStart = {
                    startX: this.xPos,
                    startWidth: this.boxWidth
                }
            },
            dragStop: function (x) {
                this.xPos = x;
                this.updateNewPosition();
            },
            onResizeStartCallback: function(){
                this.dragResizeStart = {
                    startX: this.xPos,
                    startWidth: this.boxWidth
                }
            },
            // eslint-disable-next-line no-unused-vars
            resizeStop: function (x, y, width) {
                this.boxWidth = width;
                this.updateNewPosition()
            },
            updateNewPosition: function(){
                this.$emit('updateXPos', this.xPos, this.boxWidth, this.newkey, this.strNr, this.dragResizeStart)
            },
        },
    }
</script>

<style>
    .dragBox {
        background-color: dimgrey;
        opacity: 0.7;
        border-style: solid;
        border-width: 1px;
        border-radius: 3px;
        z-index: 500
    }

    .isFocused {
        background-color: #0A2B4B;
    }
    .marked {
        background-color: #b3b3b3;
    }

</style>
