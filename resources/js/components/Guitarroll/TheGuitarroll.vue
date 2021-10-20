<template>
<div class="container">
<v-card id="seqContainer" :style="seqContainer">
    <v-card class="multiDotDisplay">
        <div class="mx-2" v-for="focusedDot in getFocusedDot.activeJemps" :key="focusedDot.dot_ID">
            {{`string: ${getFocusedDot.string}, fret: ${getFocusedDot.fret}, time: ${focusedDot.time}`}}
        </div>
    </v-card>
    <v-card-text>
      <v-row
        align="center"
        justify="center"
      >
        <v-btn-toggle
          color="primary"
          v-model="toneToggle"
          mandatory
        >
          <v-btn value="1:0" text> 
            <p>1</p>
          </v-btn>
          <v-btn value="0:2" text>
            <p>1/2</p>
          </v-btn>
          <v-btn value="0:1" text>
            <p>1/4</p>
          </v-btn>
          <v-btn value="0:0:2" text>
            <p>1/8</p>
          </v-btn>
          <v-btn value="0:0:1" text>
            <p>1/16</p>
          </v-btn>
        </v-btn-toggle>
        <v-btn-toggle class="ml-2"
            v-model="samePos"
        >
            <v-btn>
                <p>samePos</p>
            </v-btn>
        </v-btn-toggle>
        <v-btn-toggle class="ml-2"
            v-model="punkt"
        >
            <v-btn>
                <p>punktiert</p>
            </v-btn>
        </v-btn-toggle>
        <v-btn-toggle class="ml-2"
            v-model="triole"
        >
            <v-btn value="1">
                <p>triole</p>
            </v-btn>
        </v-btn-toggle>
      </v-row>
    </v-card-text>
    
    <br>
    
        <div id="outerFrame">
            <div id="seqFrame" :style="styleObject" :bind="width">
                <Columns v-bind:key="n +'n'" v-for="n in 24" :height="240" :colWidth="colWidth"></Columns>
                <DragBox
                        v-for="box in getActiveBoxes"

                        :strings="box.boxData.string"
                        :strNr="box.boxData.string"

                        :dot="box"

                        :key="box.dot_ID"
                        :newkey="box.dot_ID"

                        :y-pos="(box.boxData.string-1)*40"
                        :x-pos="box.boxData.xPos"

                        :boxWidth=box.boxData.width
                        @updateXPos="updateXPos"
                >
                </DragBox>
            </div>
        </div>
    </v-card>
</div>
</template>

<script>
    import DragBox from "./components/DragBox.vue";
    import Columns from "./components/Columns.vue";

    import { mapGetters, mapActions } from "vuex"

    export default {
        props:['width'],
        data: function () {
            return {
                styleObject: {
                  width: '2000px',
                },

                seqContainer: {
                    margin: '50px auto',
                    padding: '20px',                    

                    overflowX: 'auto',
                    backgroundColor: 'white',
                    borderRadius: '3px',
                    minHeight: '300px',
                },

                boxWidth: 20,
                instancePos: 0,
                positionAdd: 20,

                colWidth: 40,
            };

        },

        computed: {
            ...mapGetters(['getActiveBoxes', 'getFocusedDot']),
        },

        methods: {
            ...mapActions(['changeBoxPos']),
            updateXPos(xPos, width, key, strNr, dragResizeStart){
                let self = this
                let el = this.getActiveBoxes.find(el => el.dot_ID === key);

                el.boxData.xPos = xPos;
                el.boxData.width = width;
                el.time = "0:"+ (parseInt(el.boxData.xPos/40) + 1 );

                this.changeBoxPos(el);

                let changedOnActiveString = this.getActiveBoxes.filter(el => el.boxData.string === strNr && el.dot_ID !== key);

                for(let box of changedOnActiveString){
                    //set position size back to start
                    if(!this.isPosFree(box.boxData, {xPos: xPos, width: width})){

                        //needs to be delayed otherwise position of active element will not remove
                        setTimeout(() => {
                            el.boxData.xPos = dragResizeStart.startX;
                            el.boxData.width = dragResizeStart.startWidth;
                            el.time = "0:"+ (parseInt(el.boxData.xPos / 40) + 1);
                            self.changeBoxPos(el);
                        }, 10);
                        break;
                    }
                }
            },
            isPosFree(box, newBox){
                return !(box.xPos < newBox.xPos + newBox.width && box.xPos > newBox.xPos ||
                    box.xPos + box.width < newBox.xPos + newBox.width && box.xPos + box.width > newBox.xPos ||
                    box.xPos <= newBox.xPos && box.xPos + box.width >= newBox.xPos + newBox.width);
            }
        },
        // eslint-disable-next-line no-undef
        components: {DragBox, Columns}
    }
</script>

<style scoped>

    #outerFrame{
        margin: auto;
        width: 100%;
        overflow-x: auto;
        display: block;

        -webkit-box-shadow: 10px 10px 12px 1px rgba(0,0,0,0.52);
        -moz-box-shadow: 10px 10px 12px 1px rgba(0,0,0,0.52);
        box-shadow: 10px 10px 12px 1px rgba(0,0,0,0.52);
    }

    #seqFrame{
        height: 240px;
        border: 1px solid #0A2B4B;
        border-radius: 2px;
        position: relative;
    }

    .multiDotDisplay{
        height: 100px;
        overflow-y:auto;
    }
</style>
