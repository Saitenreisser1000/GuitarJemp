<template>
    <div id="fret"
         :style="{
                'top': 0,
                'height': getFbData.fbHeight + 'px',
                'width' : getFbData.fretWidth + 'px',
                'left'  : this.xPosition + 'px',
                'backgroundColor': getFbData.fretColor,
        }"
    ></div>
</template>

<script>

    import { mapGetters } from 'vuex';

    export default {
        name: "fbFrets",
        props: ['fretNr'],

        computed: {
            ...mapGetters(['getCalcSaddleOffset', 'getActualFbWidth','getFbData']),
            xPosition: function() {
                return (this.fretNr * this.getActualFbWidth / this.getFbData.fretAmount) + this.getCalcSaddleOffset;
            }
        },
    }
</script>

<style scoped>
    #fret{
        position: absolute;
        -webkit-box-shadow: 3px 0 6px 0 rgba(0,0,0,0.5);
        -moz-box-shadow: 3px 0 6px 0 rgba(0,0,0,0.5);
        box-shadow: 3px 0 6px 0 rgba(0,0,0,0.5);
    }

</style>
