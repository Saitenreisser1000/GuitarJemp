<template>
    <div id="saddle"
         :style="{
                'backgroundColor': getFbData.saddleColor,
                'height': getFbData.fbHeight + 'px',
                'width' : getFbData.saddleWidth + 'px',
                'left'  : getFbData.saddleLeftOffset + 'px'
            }"
    ></div>
</template>

<script>
    import { mapGetters } from 'vuex';

    export default {
        name: "fbSaddle",
        computed: {
              ...mapGetters(['getFbData']),
        },
    }
</script>

<style scoped>
    #saddle{
        position: relative;
        -webkit-box-shadow: 5px 0 8px 0 rgba(0,0,0,0.5);
        -moz-box-shadow: 5px 0 8px 0 rgba(0,0,0,0.5);
        box-shadow: 5px 0 8px 0 rgba(0,0,0,0.5);
    }

</style>
