<template>
    <div class="point"
         :style="{
        'top': calcTop + 'px',
        'left': calcXPos + 'px'
    }"
    ></div>
</template>

<script>

    import { mapGetters } from 'vuex';

    export default {
        props: ['onFret', 'doubleMarker', 'doublePos'],
        name: "fbMarkerPoint",

        computed: {
            ...mapGetters(['getFretSpace', 'getCalcSaddleOffset', 'getFbData']),
            calcTop: function () {
                if(this.doubleMarker){
                    return this.getFbData.fbHeight/10 * this.doublePos;
                }
                return this.getFbData.fbHeight/2 - 10;
            },
            calcXPos: function() {
                return ((this.getFretSpace * this.onFret) - this.getFretSpace/2 - 10) + this.getCalcSaddleOffset
            }
        }
    }
</script>

<style scoped>
    .point{
        position: absolute;
        background-color: dimgrey;
        border-radius: 50%;
        height: 20px;
        width: 20px;
    }

</style>
