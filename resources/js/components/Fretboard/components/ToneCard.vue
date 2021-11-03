<template>
  <v-card color=grey @click="$emit('cardFocus', tone)">   
          <v-row>
                <v-col class="px-6">
                    <v-radio-group
                        row
                        v-model="dotColor"
                        height="10"                       
                        >
                        <v-radio class="mx-0"
                            color="yellow"
                            value="yellow"
                        ></v-radio>
                        <v-radio class="mx-0" 
                            color="indianred"
                            value="indianred"
                        ></v-radio>
                        <v-radio class="mx-0"
                            color="indigo"
                            value="indigo"
                        ></v-radio>
                    </v-radio-group>
                </v-col>
                <v-col class="pa-0" ></v-col>
                <v-col class="pa-0">{{time}}</v-col>
                <v-col class="pa-0" >
                    <v-icon hover size="40" @click="$emit('remove')" >mdi-delete-outline</v-icon>
                </v-col>
                
          </v-row>
      
  </v-card>
</template>

<script>
export default {
    props:["tone", "time"],
    data(){
        return{
            defaultColor: "indianred",
        }
    },
   
    computed: {
        dotColor: {
            get(){
                return this.defaultColor;
            },
            set(value){
               this.$emit('changeColor', {'tone':this.tone, 'color':value})
            }
        }
    }
}
</script>

<style>
    
</style>
