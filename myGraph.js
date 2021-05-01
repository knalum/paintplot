$(document).ready(function () {

  var myGraph;

  var DEFAULT_Y_VALUE = 0;
  var ERROR_COLOR = "#FFBABA";

  var default_range_yMin = parseInt($(".range_yMin").val());
  var default_range_yMax = parseInt($(".range_yMax").val());

  var default_start_x = parseInt($(".start_x").val());
  var default_end_x = parseInt($(".end_x").val());

  var default_length = default_end_x-default_start_x+1;



  var data = [];

  for (var i=0;i<default_length;i++) {
    data.push([default_start_x+i,DEFAULT_Y_VALUE]);
  }


  var isDrawing = false;
  var lastDrawRow = null, lastDrawValue = null;
  var tool = 'pencil';
  var valueRange = [-9999999999, 9999999999];

  function setPoint(event, g, context) {
    var canvasx = Dygraph.pageX(event) - Dygraph.findPosX(g.graphDiv);
    var canvasy = Dygraph.pageY(event) - Dygraph.findPosY(g.graphDiv);
    var xy = g.toDataCoords(canvasx, canvasy);
    var x = xy[0], value = xy[1];
    var rows = g.numRows();
    var closest_row = -1;
    var smallest_diff = -1;



    for (var row = 0; row < rows; row++) {
      var date = g.getValue(row, 0);
      var diff = Math.abs(date - x);
      if (smallest_diff < 0 || diff < smallest_diff) {
      smallest_diff = diff;
      closest_row = row;
      }
    }

    if (closest_row != -1) {
      if (lastDrawRow === null) {
        lastDrawRow = closest_row;
        lastDrawValue = value;
      }
      
      var coeff = (value - lastDrawValue) / (closest_row - lastDrawRow);

      if (closest_row == lastDrawRow) coeff = 0.0;

      var minRow = Math.min(lastDrawRow, closest_row);
      var maxRow = Math.max(lastDrawRow, closest_row);

      for (var row = minRow; row <= maxRow; row++) {
        if (tool == 'pencil') {
          var val = lastDrawValue + coeff * (row - lastDrawRow);
          val = Math.max(valueRange[0], Math.min(val, valueRange[1]));
          data[row][1] = val;
          if (val == null || isNaN(val));
        }

      }

      lastDrawRow = closest_row;
      lastDrawValue = value;
      g.updateOptions({ file: data });
      g.setSelection(closest_row);
    }
  }

  function finishDraw() {
    isDrawing = false;
    lastDrawRow = null;
    lastDrawValue = null;
  }


  drawNewGraph(data,default_range_yMin,default_range_yMax);



  function drawNewGraph(newData,range_yMin,range_yMax){

    myGraph = new Dygraph(document.getElementById("draw_div"), newData,
    {
      labels: [ '', '' ],
      showLabelsOnHighlight: true,
      strokeWidth: 1,
      gridLineColor: 'rgb(196, 196, 196)',
      colors: "rgb(0,0,0)",
      valueRange: [range_yMin,range_yMax],
      drawYGrid: true,
      drawYAxis: true,

      stepPlot: false,

      labelsDivStyles: {'background': 'transparent',
      'font-family': 'Helvetica',
      'font-weight': 'none'},
      interactionModel: {

        mousedown: function (event, g, context) {
          if( event.shiftKey ){
              context.initializeMouseDown(event, g, context);
              if (event.altKey || event.shiftKey) {
                Dygraph.startPan(event, g, context);
              }
          }
          else{
            context.initializeMouseDown(event, g, context);
            if (tool == 'zoom') {
              Dygraph.defaultInteractionModel.mousedown(event, g, context);
            } 
            else {
              if (event.preventDefault) {
                event.preventDefault(); 
              } 
              else {
                event.returnValue = false;
                event.cancelBubble = true;
              }
              isDrawing = true;
              setPoint(event, g, context);
            }
          }
        
        },

        mousemove: function (event, g, context) {
          if( event.shiftKey ){
            if (context.isPanning) {
              Dygraph.movePan(event, g, context);
              
            }
          }
          else{
            if (tool == 'zoom') {
              Dygraph.defaultInteractionModel.mousemove(event, g, context);
            } 
            else {
            if (!isDrawing) return;
              setPoint(event, g, context);
            }
          }
        },

        mouseup: function(event, g, context) {
          if (tool == 'zoom') {
            Dygraph.defaultInteractionModel.mouseup(event, g, context);
          } 
          else {
            
            finishDraw();
          }
            g.updateOptions({
    dateWindow: g.xAxisRange(),
    valueRange: g.yAxisRange()
    });
            updateYRangeFields();
            updateXRangeFields();
          

        },
        mouseout: function(event, g, context) {
        if (tool == 'zoom') {
        Dygraph.defaultInteractionModel.mouseout(event, g, context);
        }
        },

        dblclick: function(event, g, context) {
        Dygraph.defaultInteractionModel.dblclick(event, g, context);
        },
        
        'mousewheel' : scrollV4,
        'DOMMouseScroll': scrollV4
      }


    });
    window.onmouseup = finishDraw;

  }


  function zoom(g, zoomInPercentage, xBias, yBias) {
  xBias = xBias || 0.5;
  yBias = yBias || 0.5;
  function adjustAxis(axis, zoomInPercentage, bias) {
    var delta = axis[1] - axis[0];
    var increment = delta * zoomInPercentage;
    var foo = [increment * bias, increment * (1-bias)];
    return [ axis[0] + foo[0], axis[1] - foo[1] ];
  }
  var yAxes = g.yAxisRanges();
  var newYAxes = [];
  for (var i = 0; i < yAxes.length; i++) {
    newYAxes[i] = adjustAxis(yAxes[i], zoomInPercentage, yBias);
  }

  g.updateOptions({
    dateWindow: adjustAxis(g.xAxisRange(), zoomInPercentage, xBias),
    valueRange: newYAxes[0]
    });
  }


  function offsetToPercentage(g, offsetX, offsetY) {
    // This is calculating the pixel offset of the leftmost date.
    var xOffset = g.toDomCoords(g.xAxisRange()[0], null)[0];
    var yar0 = g.yAxisRange(0);

    // This is calculating the pixel of the higest value. (Top pixel)
    var yOffset = g.toDomCoords(null, yar0[1])[1];

    // x y w and h are relative to the corner of the drawing area,
    // so that the upper corner of the drawing area is (0, 0).
    var x = offsetX - xOffset;
    var y = offsetY - yOffset;

    // This is computing the rightmost pixel, effectively defining the
    // width.
    var w = g.toDomCoords(g.xAxisRange()[1], null)[0] - xOffset;

    // This is computing the lowest pixel, effectively defining the height.
    var h = g.toDomCoords(null, yar0[0])[1] - yOffset;

    // Percentage from the left.
    var xPct = w == 0 ? 0 : (x / w);
    // Percentage from the top.
    var yPct = h == 0 ? 0 : (y / h);

    // The (1-) part below changes it from "% distance down from the top"
    // to "% distance up from the bottom".
    return [xPct, (1-yPct)];
  }


  function scrollV4(event, g, context) {
    

  var normal = event.detail ? event.detail * -1 : event.wheelDelta / 40;
  var percentage = normal / 50;

  if (!(event.offsetX && event.offsetY)){
    event.offsetX = event.layerX - event.target.offsetLeft;
    event.offsetY = event.layerY - event.target.offsetTop;
  }

  var percentages = offsetToPercentage(g, event.offsetX, event.offsetY);
  var xPct = percentages[0];
  var yPct = percentages[1];

  zoom(g, percentage, xPct, yPct);
  Dygraph.cancelEvent(event);
  
  updateYRangeFields();
  updateXRangeFields();

}


  var dataFieldVisible = false;

  $(document).on("change mouseup","#separatorList",function(e){
    getData();
  });


  $(document).on("change","#lineType",function(e){

    var lineType = $("#lineType").val();

    if(lineType=="line"){
      myGraph.updateOptions({stepPlot:false});
    }
    else if(lineType=="stair"){
      myGraph.updateOptions({stepPlot:true});
    }

  });



  $(document).on("click","#dataButton",function(){
    getData();
  });

  $(document).on("focusout","#userDefinedSeparator",function(){
    getData();
  });

  $(document).on("keypress","#userDefinedSeparator",function(e){
    if(e.keyCode == 13){
      getData();
    }
  });

  $(document).on("click","#imageButton",function(){
    $("#dataDiv").html("<img id='demoimg'><img>");
    var img = document.getElementById('demoimg');

    Dygraph.Export.asPNG(myGraph, img);

  });

  function reloadStylesheets() {
    var queryString = '?reload=' + new Date().getTime();
    $('link[rel="stylesheet"]').each(function () {
        this.href = this.href.replace(/\?.*|$/, queryString);
    });
}

  $(function() {
    $( "#rTest" ).resizable({   maxHeight: 850,
    maxWidth: 1600,
    minHeight: 200,
    minWidth: 500});
  });


  $("#rTest" ).resize(function() {
    var rX = $("#rTest").css("width");
    var rY = $("#rTest").css("height");

    rY = -50+parseInt(rY);

    $("#draw_div")
    .css({"width":rX})
    .css({"height":rY});
    myGraph.resize();

  });


  function getData(){
    $("#dataDiv").html("<textarea id='exportDataField'></textarea>");
    $("#dataField").text("");

    var str = "";
    var separator = "";
    var selectedSeparator = $("#separatorList").val();

    if(selectedSeparator=="csv") separator = ",";
    else if(selectedSeparator=="tsv") separator = "\t";
    else if(selectedSeparator=="space") separator = " ";
    else if(selectedSeparator=="semicolon") separator = ";";
    else if(selectedSeparator=="colon") separator = ":";

    if(selectedSeparator=="userDefined"){
      $("#userDefinedSeparator").css({"visibility":"visible"});

      var userDefinedSeparator = $("#userDefinedSeparator").val();
      separator = userDefinedSeparator;
    }
    else{
      $("#userDefinedSeparator").css({"visibility":"hidden"});
    }

    for(var i=0;i<data.length;i++){
      str += data[i][0]+separator+data[i][1]+"\n";
    }

    $("#exportDataField").html(str);
  }


  $(document).on("dblclick","#dataField",function(){
    $(this).select(); 
  });

  $(document).on("keypress",".range_yMin,.range_yMax,.range_xMin,.range_xMax,.start_x,.end_x",function(e){
    if( e.keyCode == 13 ){
      if ( textFieldIsValid(".range_yMin") && textFieldIsValid(".range_yMax") && textFieldIsValid(".range_xMin") && textFieldIsValid(".range_xMax") ){
        if( xRangeMinMaxIsValid() ){
          updateData();
        }
      }
    }
  });

  $(document).on("")

  function xRangeMinMaxIsValid(){
    var start_x = parseFloat($(".start_x").val());
    var end_x = parseFloat($(".end_x").val());

    if( start_x < end_x ){
      $(".start_x").css('background', 'white');
      $(".end_x").css('background', 'white');
      clearErrorMessage();
      return true;
    }
    else{
      $(".start_x").css('background', ERROR_COLOR);
      $(".end_x").css('background', ERROR_COLOR);
      displayErrorMessage("x<sub>min</sub> needs to be less than x<sub>max</sub>");
      return false;
    }
  }

  $(document).on("click","#resetDataButton",function(){

    var start_x = parseInt($(".start_x").val());
    var end_x = parseInt($(".end_x").val());
    var length = end_x - start_x+1;

    data=[];
    for (var i=0;i<length;i++) {
      data.push([start_x + i,DEFAULT_Y_VALUE]);
    }

    myGraph.updateOptions({
    "file":data,
    valueRange: [-10,10]
    });

    updateYRangeFields();
    updateXRangeFields();
  });

  function autoscale(){
    var maxX = data[0][0];
    var minX = data[0][0];

    var maxY = data[0][1];
    var minY = data[0][1];

    for(var i=0;i<data.length;i++){
      var dataX = data[i][0];
      var dataY = data[i][1];

      if(dataX > maxX){
        maxX = dataX;
      }
      if(dataX < minX){
        minX = dataX;
      }

      if(dataY > maxY){
        maxY = dataY;
      }
      if(dataY < minY){
        minY = dataY;
      }
    }

    if(minY == maxY){
      minY = minY-0.1;
      maxY = maxY+0.1;
    }



    $(".range_yMin").val(minY);
    $(".range_yMax").val(maxY);

    $(".start_x").val(minX);
    $(".end_x").val(maxX);

    myGraph.updateOptions({
    "file":data,
    valueRange: [minY,maxY],
    dateWindow: [minX,maxX]
    });

    updateYRangeFields();
    updateXRangeFields();
  }


  $(document).on("click","#autoscaleButton",function(){
    autoscale();
  });



  function updateYRangeFields(){

    var res = myGraph.getOption("valueRange");

    var yMin = res[0].toFixed(1);
    var yMax = res[1].toFixed(1);

    $(".range_yMin").val(yMin);
    $(".range_yMax").val(yMax);  

  }

  function updateXRangeFields(){

    var res = myGraph.getOption("dateWindow");

    var xMin = res[0].toFixed(1);
    var xMax = res[1].toFixed(1);

    $(".range_xMin").val(xMin);
    $(".range_xMax").val(xMax);  
  }  



  function updateData(){
    var range_yMin = parseFloat($(".range_yMin").val());
    var range_yMax = parseFloat($(".range_yMax").val());

    var new_start_x = parseInt($(".start_x").val());
    var new_end_x = parseInt($(".end_x").val());
    var new_length = new_end_x-new_start_x + 1;

    var old_start_x = parseInt(data[0][0]);
    var old_end_x = parseInt(data[data.length-1][0]);
    var old_length = old_end_x - old_start_x + 1;


    var data2 = [];

    if( new_end_x == old_end_x ){
      if( new_start_x < old_start_x ){
        var j = new_start_x;
        for(i=0;i< old_start_x - new_start_x;i++){
          data2.push([j,0]);
          j++;
        }

        for(i=0;i< new_end_x - old_start_x +1;i++){
          data2.push([j,data[i][1]]);
          j++;
        }

      }
      else if( new_start_x == old_start_x ){
        // ARRAY IS SAME
        data2 = data;
      }
      else{
        var j = new_start_x - old_start_x;
        for(var i=new_start_x;i<new_end_x+1;i++){
          data2.push([i,data[j][1]]);
          j++;
        }
      }
    }
    else if( new_end_x < old_end_x ){
      if( new_start_x < old_start_x ){
        var j = new_start_x;
        for(i=0;i< old_start_x - new_start_x;i++){
          data2.push([j,0]);
          j++;
        }

        for(i=0;i< new_end_x - old_start_x +1;i++){
          data2.push([j,data[i][1]]);
          j++;
        }
      }
      else if( new_start_x == old_start_x ){
        var j = 0;
        for(var i=new_start_x;i<new_end_x+1;i++){
          data2.push([i,data[j][1]]);
          j++;
        }
      }
      else{
        var j = new_start_x - old_start_x;
        for(var i=new_start_x;i<new_end_x+1;i++){
          data2.push([i,data[j][1]]);
          j++;
        }
      }
    }
    else if( new_end_x > old_end_x ){
      if( new_start_x < old_start_x ){
        var j = new_start_x;
        for(i=0;i< old_start_x - new_start_x;i++){
          data2.push([j,0]);
          j++;
        }

        for(i=0;i< new_end_x - old_start_x +1;i++){
          if( data[i] == undefined){
            data2.push([j,0]);  
          }
          else{
            data2.push([j,data[i][1]]);
          }
          j++;
        }

      }
      else if( new_start_x == old_start_x ){
        var j = 0;
        for(var i=new_start_x;i<new_end_x+1;i++){
          if( data[j] == undefined ){
            data2.push([i,0]);
          }
          else{
            data2.push([i,data[j][1]]);
          }
          j++;
        }

      }

      else{
        var j = 0;
        for(var i=new_start_x;i<new_end_x + 1;i++){
          if( data[j] == undefined ){
            data2.push([i,0]);  
          }
          else{
            data2.push([i,data[j][1]]);
          }
          j++;
        }

      }
    }


    data = data2;

    var range_xMin = parseInt($(".range_xMin").val());
    var range_xMax = parseInt($(".range_xMax").val());


    myGraph.updateOptions({
    "file":data2,
    valueRange: [range_yMin,range_yMax],
    dateWindow: [range_xMin,range_xMax]
    });
  }



  $(document).on("keypress","#userDefinedFunction",function(e){
    if(e.keyCode == 13){
      plotUserDefinedFunction();
    }
  });

  function plotUserDefinedFunction(){
    $("#userDefinedFunction").css('background-color', 'white');

    var functionInput = $("#userDefinedFunction").val();

    var start_x = parseInt($(".start_x").val());
    var end_x = parseInt($(".end_x").val());

    var funcData = [];
    var functionInputReplaced;

    if( functionInput.match(/[0-9][A-Za-z]/g) ){
      $("#userDefinedFunction").css('background-color', ERROR_COLOR);
      displayErrorMessage("Syntax error in user defined function");
    }


    else{
    $("#userDefinedFunction").css('background-color', 'white');
    clearErrorMessage();

    for (var i=start_x;i<end_x+1;i++) {
    functionInputReplaced = functionInput.replace(/rand\(x\)/g,Math.random());
    functionInputReplaced = functionInputReplaced.replace(/x/g,i);


    try{
      var f_x = math.evaluate(functionInputReplaced);
    }
    catch(e){
      $("#userDefinedFunction").css('background-color', ERROR_COLOR);
      displayErrorMessage("Syntax error in user defined function");
      break;
    }
    funcData.push([i,f_x]);
    }

    data = funcData;
    myGraph.updateOptions({'file':data});

    }
  }

  $(document).on("change","#dataField",function(e){
    $("#importDataButton").click()
  })


  $(document).on("click","#importDataButton",function(){

    if(dataFieldVisible==false){
    $("#dataDiv").html("<textarea id='dataField' placeholder='Paste data here'></textarea>");
    $("#dataField").text("");
    dataFieldVisible=true;
    }

    var textFieldData = $("#dataField").val();
    textFieldData = $.trim(textFieldData);


    if( textFieldData.match(/[A-Za-z]/g) ){
    alert("Invalid import data");
    }


    if(textFieldData!=""){

    var myArray = textFieldData.split('\n');

    var data2 = [];

    var minY = 0;
    var maxY = 0;

    var separator = ',';

    if( textFieldData.search(';') > 0){

      separator = ';';
    }
    else if( textFieldData.search('\t') > 0){
      separator = "\t";
    }
    else if( textFieldData.search(' ') > 0 ){
      separator = " ";
    }
    else if( textFieldData.search(':') > 0){
      separator = ":";
    }


    for(i=0;i<myArray.length;i++){
      var elementSplit = myArray[i].split(separator);

      var dataX = parseInt(elementSplit[0]);
      var dataY = parseFloat(elementSplit[1]);

      if(dataY>maxY){
        maxY = dataY;
      }
      else if(dataY<minY){
        minY = dataY;
      }


      data2.push( [dataX,dataY] );
    }

    data = data2;

    var start_x = parseInt(myArray[0].split(",")[0]);
    var end_x = parseInt(myArray[myArray.length-1].split(",")[0]);

    $(".start_x").val(start_x);
    $(".end_x").val(end_x);

    myGraph.updateOptions({
      "file":data2,
      valueRange: [minY,maxY],
      dateWindow: [start_x,end_x]
    });
    }
  });


 $('#draw_div').bind('DOMMouseScroll', function(e){
     if(e.originalEvent.detail > 0) {
         scrollV4(e,myGraph);
     }else {
         scrollV4(e,myGraph);
     }

     //prevent page fom scrolling
     return false;
 });

 $(".aboutText").click(function(event) {
  $("#popup").bPopup();
 });

  $(".helpText").click(function(event) {
    $("#helpPopup").bPopup();
   });


 $("#userDefinedFunctionLink").click(function(event){
  $("#userDefinedFunctionPopup").bPopup();
 });

  $(document).ready(function() {
    $('a[href*="[at]"][href*="[dot]"]').each(function() {
      var email = $(this).attr('href').split('[at]').join('@').split('[dot]').join('.');
      $(this).attr('href', 'mailto:' + email.toLowerCase());
      if ($(this).text().length == 0) $(this).text(email);
    });
  });

 function numberIsValidFloatOrInteger(number){
  if( number.match(/^[+-]\d+$/) || number.match(/^\d+$/) || number.match(/^[+-]\d+\.\d+$/) || number.match(/^\d+\.\d+$/) ){
    return true;
  }
  return false;
 }

 function numberIsWithinRange(number,range){

  if( Math.abs(number) < range){

    return true;
  }
  return false;
 }

 function textFieldIsValid(textField){
  var range = 0;
  if( textField.indexOf('y')>-1){
    range = 1e20;
  }
  else if( textField.indexOf('x')>-1){
    range = 1e5;
  }

  if( numberIsValidFloatOrInteger($(textField).val()) && numberIsWithinRange($(textField).val(),range) ){
    $(textField).css('background', 'white');
    clearErrorMessage();
    return true;
  }
  else{
    $(textField).css('background', ERROR_COLOR);
    displayErrorMessage("Range field is not valid");
    return false;
  }
 }

 $(".range_yMin").change(function(){
  textFieldIsValid(".range_yMin");
 });

  $(".range_yMax").change(function(){
    textFieldIsValid(".range_yMax");
   });

    $(".start_x").change(function(){
      if( xRangeMinMaxIsValid() ){
        textFieldIsValid(".start_x");
      }
   });

    $(".end_x").change(function(){
    if( xRangeMinMaxIsValid() ){
      textFieldIsValid(".end_x");
    }
   });

    function displayErrorMessage(message){
      $("#informationPanel").css({
        background: '#FFBABA',
        border: '1px solid red'
      });

      $("#informationPanel").html(message);
    }

    function clearErrorMessage(){
      $("#informationPanel").html("");
      $("#informationPanel").css({
              background: 'white',
              border: 'none'
            });
    }

    $(".functionExample").click(function(){
      var functionString = $(this).html();

      $("#userDefinedFunction").val(functionString);
      $("#userDefinedFunctionPopup").bPopup().close();
      plotUserDefinedFunction();
      autoscale();
    });


    $(".spinner").spinner();


    $('.spinner').spinner({
      spin: function(event,ui){
        if ( textFieldIsValid(".range_yMin") && textFieldIsValid(".range_yMax") && textFieldIsValid(".start_x") && textFieldIsValid(".end_x") ){
          if( xRangeMinMaxIsValid() ){
            updateData();
          }
        }
      }
    });



    $("html").on("mousewheel",function(event){
      var deltaY = event.deltaY;

      var speedFactor = 1;

      if( event.ctrlKey ){

          var range_yMin = parseInt($(".range_yMin").val());
          var range_yMax = parseInt($(".range_yMax").val());

          range_yMin = range_yMin-deltaY*speedFactor;
          range_yMax = range_yMax+deltaY*speedFactor;  

          $(".range_yMin").val(range_yMin);
          $(".range_yMax").val(range_yMax);
          
          myGraph.updateOptions({
          valueRange: [range_yMin,range_yMax]
          });

      }
      else if( event.altKey ){
        var range_xMin;
        var range_xMax;

        range_xMin = parseInt($(".range_xMin").val())-deltaY*speedFactor;
        range_xMax = parseInt($(".range_xMax").val())+deltaY*speedFactor;

          $(".range_xMin").val(range_xMin);
          $(".range_xMax").val(range_xMax);


          
          myGraph.updateOptions({
            dateWindow: [range_xMin,range_xMax]
          });
      }



    });



});