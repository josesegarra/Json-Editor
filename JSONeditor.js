
var jsonEditor = {};

(function () {

    var dragging = null;

    var colors = ["#C0C0C0", "#D0D0D0", "#E0E0E0", "#F0F0F0"];

    function CT(level, parent) {
        opt = document.createElement("DIV");
        if (level >= 0) {
            opt.style.paddingBottom = "2px";
            opt.style.paddingLeft = level * 4 + "px";
        }
        parent.appendChild(opt);
        return opt;
    }

    function CS(parent,text,onclick) {
        opt = document.createElement("SPAN");
        parent.appendChild(opt);
        opt.style.display = "inline-block";
        opt.textContent = text;
        if (onclick){
            opt.style.cursor = "pointer";   
            opt.onclick=onclick;     
        }
        return opt;
    }


    function CEdit(parent, text,isProp) {
        var input={};
        input.label=CS(parent, text);                                                                                       // Create a label
        if (isProp){                                                                                                        // Only property names are editable
            input.label.style.cursor = "pointer";                                                                           // And display a mouse cursor
            input.label.onclick = function () {
                alert("EDIT TEXT");
                /*this._input.value = this.innerHTML;
                this._input.style.color = "black";
                this._input.style.display = "inline";
                this._input.style.width = (this.getBoundingClientRect().width + 15) + "px";
                this.style.display = "none";

                this._input.focus();
                */
            }
        }
        /*l._input.onkeydown = function (event) {
            if (event.keyCode == 27) { this.style.display = "none"; this._label.style.display = "inline";return;}
            if (event.keyCode != 13) { this.style.color = "red"; return;}
            var value=this.value;
            var editor = getEditor(parent.parentElement);
            log("*");
            if (l._isProp) {
                value=value.trim();
                if (!value) { log("Cannot have empty property name"); this.blur(); return; }
                if (data.parent[value]) { log("Cannot have duplicate property names"); this.blur(); return; }
                data.parent[value] = data.parent[data.field];                           // Create a new property 
                delete data.parent[data.field];                                         // Delete the old one
                log("Changed property name [" + data.field+ "] -> [" + value+ "]");     // Log the change
                data.field = value;                                                     // Change the field definition
            } else {
                data.parent[data.field] = value;
                log("Changing value {parent}.[" + data.field + "] = " + value + "");        // Log the change
            }
            this._label.innerHTML = value;
            this.blur();
            update(editor);
        }
        return l;*/
        return input.label;
    }

   
    function ot(data){
        return Object.prototype.toString.call(data).replace("object ","").toLowerCase();
    }

    function loop(data,func){
        var dataType=ot(data);
        if (dataType=="[array]") {
            for (var i = 0; i < data.length; i++) func(i,data[i]); 
            return true;
        }
        if (dataType=="[object]") {
            for (var s in data) func(s,data[s]);
            return true;
        }
        return false;
    }

    var buttons={ };
    
    buttons.remove=function(){
         var d=buttons.curDiv._jParent;
         if (ot(d)=="[array]") d.splice(buttons.curDiv._jName, 1); else delete d[buttons.curDiv._jName];
         redraw(buttons.curDiv.parentElement,d);
    }

    function redraw(div,d){
        var a = div.firstChild,b;
        while (a) {
            b=a.nextElementSibling;
            if (a.tagName=="DIV" && a!=buttons.command) div.removeChild(a);
            a =b;
        }
        loop(d,function(name,value){
                drawNode(div._jLevel+1,name,d,value,div,div._jOnElement);
        });
        div._jHint.innerHTML=asJson(d);
    
    }

    buttons.insert=function(k){
        var d=buttons.curDiv._jData;
        if (ot(d)=="[array]") d.push("new value"); 
        else d[ "property_"+Object.keys(d).length]=k;
        redraw(buttons.curDiv,d);
    }

    function style(element,kind,jItem,action){
        if (kind=="node") element.style.border="1px solid "+(action=="select" ? "#CCC":"transparent");
        if (kind=="span") element.style.width="8px";
        if (kind=="label") element.style.marginRight="10px";
        if (kind=="button") {
            element.style.cursor="pointer";
            element.innerHTML=(jItem.bOpened ? "-":"+");
        }
        if (jItem && jItem.host) jItem.host.onNotify(kind,element,jItem,action);                                                                       // Notify host of element creation
        return element;
    }

    // Draws a node
    function drawNode(level, name, parent,data, div,host) {
        if (level > 200) throw "OVERFLOW";                                                                             // Do not go more than 200 levels deep
        var jItem={level:level,name:name,parent:parent,data:data,host:host};                                           // Initialize node data
        jItem.eNode= style(CT(level, div),"node",jItem,"new");                                                         // Create NODE element
        jItem.eNode.onmouseenter=function(e){ host.select(jItem);};                                                    // On mouse enter node
        jItem.eNode.onmouseleave=function(e){ host.select(null);};                                                     // On mouse leave node

        jItem.eButton= style(CS(jItem.eNode, ""),"span",jItem,"new");                                                  // Create BUTTON element
        jItem.eName=style(CEdit(jItem.eNode, name, ot(parent)!="[array]"),"label",jItem,"new");                        // Create LABEL element
        jItem.eHint= style(CS(jItem.eNode, ""),"hint",jItem,"new");                                                    // Create HINT element
 
        if (loop(data,function(name,value){drawNode(level+1,name,data,value,jItem.eNode,host);})) {                    // If this is a structured node (array/object), draw its children
            jItem.bOpened=true;                                                                                        // upgrade the span to a opened button 
            jItem.eButton.onclick=function(){ 
                jItem.bOpened=!jItem.bOpened;
                var a=jItem.eNode.firstChild;
                while (a){
                   if (a.tagName=="DIV" && a!=jItem.host.buttons) a.style.display=jItem.bOpened ? "block":"none";
                   a = a.nextSibling;  
                }
                style(jItem.eButton,"button",jItem,"toggle");
            };                                                                         // Which can be clicked 
            style(jItem.eButton,"button",jItem,"new");                                                                 // and notify host
        } else {
            jItem.eEdit=style(CEdit(jItem.eNode,data.toString(),true),"edit",jItem,"new");                             // In other case, create an EDIT
        }
    }

      function openOrClose(){
        /*var close=this.innerHTML=="-";
        this.innerHTML=close?"+":"-";
        var a = this;
        while (a) {
            if (a.tagName=="DIV") a.style.display=close ? "none":"block";
            a = a.nextElementSibling;
        }
        var d=this.parentElement;
        if (d._jData && d._jonOpen) d._jonOpen(d.)
            console.log(d._jData);
        }*/
    }    




    jsonEditor.edit = function (where, json,onNotify) {
        var r={};
        r.onNotify=onNotify?onNotify:function(){};
        where.innerHTML = "";                                                               // Clear container
        r.canvas= document.createElement("DIV");                                             // Create a relative DIV inside
        r.canvas.style.position = "relative";
        r.canvas.style.width= "100%";
        r.canvas.style.height= "100%";
        where.appendChild(r.canvas);
        
        r.display = document.createElement("DIV");                                        // Create the display
        r.display.style.position = "absolute";
        r.display.style.left= "0px";
        r.display.style.top= "0px";
        r.display.style.right= "0px";
        r.display.style.bottom= "0px";
        r.display.style.overflow = "auto";
        r.canvas.appendChild(r.display);


        var b= document.createElement("DIV");
        b.style.float="right";
        b.style.top="0px";
        b.style.position="relative";
        b.style.border="1px solid yellow";
        b.style.background="#FFFCC9";
        b.style.zIndex=8000;
        CS(b,"Remove",buttons.remove).style.marginRight="5px";
        CS(b,"| Value",function() { buttons.insert("New value");}).style.marginLeft="5px";
        CS(b,"| Object",function() { buttons.insert({});}).style.marginLeft="5px";
        CS(b,"| Array",function() { buttons.insert([]);}).style.marginLeft="5px";
        r.buttons=b;


        r.select=function(jItem){
            if (this.selected==jItem) return;    
            if (this.selected){
                 style(this.selected.eNode,"node",this.selected,"unselect");
                 this.selected.eNode.removeChild(this.buttons);
                 this.selected=undefined;
            }
            if (!jItem) return;
            this.selected=jItem;    
            style(jItem.eNode,"node",jItem,"select");
            jItem.eNode.insertBefore(this.buttons, jItem.eNode.firstChild);
        }





        drawNode(0, undefined, null, json,r.display,r);
        return r;
    }

})();
