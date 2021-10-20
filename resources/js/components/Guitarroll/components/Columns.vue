<template>
    <div>
        <div id="oddCol" class="col" :style="{ height: height+'px', width: width +'px' }"></div>
        <div id="evenCol" class="col" :style="{ height: height+'px', width: width +'px'  }"></div>
    </div>
</template>

<script>
    export default{
        props:['height', 'width'],
    }
</script>

<style scoped>
    .col{
        float:left;
        z-index: 0;
        top:0;
        height: 100%;
        width: 40px;
    }
    #oddCol{
        background-color: darkgrey;
    }
    #evenCol{
        background-color: #dadcdc;
    }
</style>
