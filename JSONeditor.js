
var jsonEditor = {};

(function () {

    function NE(what,parent){                                                                                               // Helper function that creates a DOM element 
        if (!what) what="DIV";
        var d=document.createElement(what);
        if (parent) parent.appendChild(d);
        return d;
    }
    
    function CT(level, parent) {                                                                                            // Helper function that creates a NESTED DIV element
        opt = SE(NE("DIV",parent),"position:relative;"+
            (level>0?"paddingBottom:2px;paddingLeft:"+(level * 4)+"px":""));
        return opt;
    }

    function CS(parent,text,onclick) {                                                                                      // Helper function that creates a CLICKABLE text element 
        opt = NE("SPAN",parent);
        opt.style.display = "inline-block";
        opt.textContent = text;
        if (onclick){
            opt.style.cursor = "pointer";   
            opt.onclick=onclick;     
        }
        return opt;
    }
    
    function SE(element,st){                                                                                                // Text function that applies a bunch of styles to an element
        st=st.split(";");
        for(var i=0;i<st.length;i++){
            var s=st[i].split(":");
            if (s.length==2) element.style[s[0]]=s[1];
        }
        return element;
    }


    function CInput(parent,where,func){
        var e=document.createElement("input");
        var value=where.innerHTML;
        where.parentElement.insertBefore(e,where);
        e.style.width=(where.getBoundingClientRect().width + 15) + "px";
        e.type="text";
        e.value=value;
        where.style.display="none";
        e.style.color = "black";
        e.display = "inline";
        e.onblur=function(){
            e.onblur=null;                                              // http://stackoverflow.com/questions/21926083/failed-to-execute-removechild-on-node
            where.style.display="inline";
            this.parentElement.removeChild(this);
        }
        e.onkeydown = function (event) {
            if (event.keyCode == 27) return this.onblur(); 
            if (event.keyCode != 13) { this.style.color = "red";return;}
            func(this.value,where);
            this.onblur();
        }


        e.focus();
        return e;
    }


    function CEdit(jItem, isValue) {
        var label=CS(jItem.eNode, isValue ? jItem.data.toString():jItem.name);                                              // Create a label
        if (isValue || ot(jItem.parent)!="[array]"){                                                                        // Editable if is Value or Object Property
            label.style.cursor = "pointer";                                                                                 // And display a mouse cursor
            label.onclick = function () {
                var input=CInput(this.parentElement,this,function(nt,l){
                    nt=nt.trim();
                    if (nt=="" && !isValue) return;
                    l.innerHTML=nt;
                    if (isValue) {
                        jItem.data=nt;
                        jItem.parent[jItem.name]=nt;    
                        jItem.host.onNotify("value",l,jItem,"changed",jItem.name);    
                        jItem.host.onNotify("data",undefined,jItem.parent,"changed",jItem.name);    
                    } else {
                        var s=jItem.name;
                        jItem.name=nt;
                        jItem.parent[nt]=jItem.parent[s];   
                        delete jItem.parent[s];    
                        jItem.host.onNotify("name",l,jItem,"changed",s);    
                        jItem.host.onNotify("data",undefined,jItem.parent,"name",s);    
                    }
                });
            }
        }
        return label;
    }

    function ot(data){
        return Object.prototype.toString.call(data).replace("object ","").toLowerCase();                                    // Normalized type name of some javascript data
    }

    function loop(data,func,p){                                                                                             // Loop utility
        if (data instanceof HTMLElement){                                                                                   // For DOM elements
            var i=0,a=data.firstChild;                                                                                      // Get first element                                                              
            while (a){                                                                                                      // And loop all its siblings (until end of FALSE is returned)
                var b=a.nextSibling;                                                                                        // Do it this way, as [a] might be removed in the func handler
                if (func(a,i,p)===false) return true;
                a=b;
            }                                                              
            return true;           
        }

        var dataType=ot(data);                                                                                              // Get the data type
        if (dataType=="[array]") {                                                                                          // If an array
            for (var i = 0; i < data.length; i++) if (func(data[i],i,p)===false) return true;                               // Loop all its items     
            return true;
        }
        if (dataType=="[object]") {                                                                                         // If an obejct
            for (var s in data) if (func(data[s],s,p)===false) return true;                                                 // Loop all its members
            return true;
        }
        return false;                                                                                                       // If no looping took place return false
    }


    function notify(element,kind,jItem,action,data){
        if (element){
            if (kind=="node") element.style.border="1px solid "+(action=="select" ? "#CCC":"transparent");                      // Apply some default styles
            if (kind=="span") element.style.width="8px";
            if (kind=="label") element.style.marginRight="10px";
            if (kind=="button") {
                element.style.cursor="pointer";
                element.innerHTML=(jItem.bOpened ? "-":"+");
            }
        }
        jItem.host.onNotify(kind,element,jItem,action,data);                                                                     // Notify host of action on element
        return element;                                                                                                     // Return the element     
    }

    // Draws a node
    function drawNode(level, name, parent,data, div,host,op) {
        if (level > 200) throw "OVERFLOW";                                                                                  // Do not go more than 200 levels deep
        var jItem={level:level,name:name,parent:parent,data:data,host:host};                                                // Initialize node data
        jItem.eNode= notify(CT(level, div),"node",jItem,op);                                                             // Create NODE element
        jItem.eNode.onmouseenter=function(e){ host.select(jItem);};                                                         // On mouse enter node
        jItem.eNode.onmouseleave=function(e){ host.select(null);};                                                          // On mouse leave node

        jItem.eButton= notify(CS(jItem.eNode, ""),"span",jItem,op);                                                         // Create BUTTON element
        jItem.eName=notify(CEdit(jItem,false),"label",jItem,op);                                                             // Create an EDIT for LABEL element
        jItem.eHint= notify(CS(jItem.eNode, ""),"hint",jItem,op);                                                           // Create HINT element
 
        if (loop(data,function(value,name){drawNode(level+1,name,data,value,jItem.eNode,host,op);})) {                         // If this is a structured node (array/object), draw its children
            jItem.bOpened=true;                                                                                             // By default strctured node is in OPEN state 
            jItem.eButton.onclick=function(){                                                                               // If clicking on button
                jItem.bOpened=!jItem.bOpened;                                                                               // Toggle OPEN state
                loop(jItem.eNode,function(a){if (a.tagName=="DIV") a.style.display=jItem.bOpened ? "block":"none";});       // Show/Hide child nodes
                notify(jItem.eButton,"button",jItem,"toggle");                                                              // Notify host ot TOGGLE action    
            };                                                                                                               
            notify(jItem.eButton,"button",jItem,op);                                                                        // Notify host of BUTTON creation
        } else jItem.eEdit=notify(CEdit(jItem,true),"edit",jItem,op);                                                      // If not a STRUCTURED node, create an EDIT for value
    }

    

    function toolBar(editor){
        var tb={ editor: editor};                                                                                           // This is the toolbar object 
        tb.eDiv= SE(document.createElement("DIV"),"top:0px;right:0px;position:absolute;"+                                   // Create the toolbar    
            "border:1px solid yellow;background:#FFFCC9;zIndex:2000");
        CS(tb.eDiv,"Remove | ",function() { editor.remove();});                                                             // Editor ACTION remove
        CS(tb.eDiv,"Value | ",function() { editor.insert("New value");});                                                   // Editor ACTION insert value
        CS(tb.eDiv,"Object | ",function() { editor.insert({});});                                                           // Editor ACTION insert OBJECT
        CS(tb.eDiv,"Array ",function() { editor.insert([]);});                                                              // Edutor ACTION insert ARRAY
        
        tb.hide=function(){                                                                                                 // Hide editor
            this.eDiv.style.display="none";                                                                                 // Just hide it
        }

        tb.show=function(jItem){                                                                                            // Show editor
            this.eDiv.style.display="block";                                                                                // Make it visible
            var b=ot(jItem.data);                                                                                           // Get data type
            b=(b=="[object]" || b=="[array]");                                                                              // True if object or array
            this.eDiv.children[0].innerHTML="Remove "+(b ? " | ":"");                                                       // Fix display of "Remove"
            this.eDiv.children[0].style.display=(jItem.parent?"inline":"none");                                             // Fix visibility or "Remove" (always, except for root node)
            this.eDiv.children[1].style.display= b ? "inline":"none";                                                       // Fix visibility for ADD nodes (only if selected ARRAY or OBJECT)     
            this.eDiv.children[2].style.display= b ? "inline":"none";    
            this.eDiv.children[3].style.display= b ? "inline":"none";    
            jItem.eNode.insertBefore(this.eDiv, jItem.eNode.firstChild);                                                    // Place toolbar on NODE (top-right)
        }
        return tb;                                                                                                          // Return toolbar
    }

    //function drawNode(level, name, parent,data, div,host) {
    function redraw(div,d,newLevel,host){
        loop(div,function(a){
            if (a.tagName=="DIV") div.removeChild(a);
        });
        loop(d,function(value,name){ 
            drawNode(newLevel,name,d,value,div,host,"update");
        });
    }


    jsonEditor.edit = function (where, json,onNotify) {
        var r={};
        r.onNotify=onNotify?onNotify:function(){};
        where.innerHTML = "";                                                                                               // Clear container
        r.canvas= SE(NE("DIV",where),"position:relative;width:100%;height:100%");                                           // Create a relative DIV inside container
        r.display = SE(NE("DIV",r.canvas),"position:absolute;left:0px;top:0px;right:0px;bottom:0px;overflow:auto");         // Create the display
        drawNode(0, undefined, null, json,r.display,r,"new");                                                                     // Draw root node    
        r.toolBar=toolBar(r);                                                                                               // Create the tool bar. ToolBar must implement hide() & show(jItem)

        r.select=function(jItem){                                                                                           // This function is called when a node is selected
            var previous=this.selected;                                                                                     // Previous selection
            if (this.selected==jItem) return previous;                                                                      // If selected is current then exit
            if (this.selected){                                                                                             // If there was a previous selected
                 notify(this.selected.eNode,"node",this.selected,"unselect");                                               // Notify host of UNSELECT action     
                 if (r.toolBar && r.toolBar.hide) r.toolBar.hide();                                                         // If there is a toolbar then hide it
            }
            this.selected=jItem;                                                                                            // Set new selection
            if (jItem){                                                                                                     // If new selection then
                notify(jItem.eNode,"node",jItem,"select");                                                                  // Notify host of SELECT action
                if (r.toolBar && r.toolBar.show) r.toolBar.show(jItem);                                                     // Update toolbar    
            }
            return previous;                                                                                                // Return previous selection 
        }
        
        r.remove=function(){                                                                                                // This function is called to remove the selected node
            if (!this.selected) return;                                                                                     // If no current selection then exit
            var jThis=this.select(null);                                                                                    // Get current selection (and unselect it)
            if (ot(jThis.parent)=="[array]") jThis.parent.splice(jThis.name, 1); else delete jThis.parent[jThis.name];
            
            var dParent=jThis.eNode.parentElement;
            redraw(dParent,jThis.parent,jThis.level,jThis.host );
            notify(dParent,"node",jThis,"remove");      
            jThis.host.onNotify("data",undefined,jThis.parent,"removed",jThis.name);    
        }

        r.insert=function(k){
            if (!this.selected) return;                                                                                     // If no current selection then exit
            var jThis=this.select(null),name="";                                                                            // Get current selection (and unselect it)
            if (ot(jThis.data)=="[array]") {                                                                                // Depending on parent being ARRAY or OBJECT
                name=jThis.data.length;                                                                                     // and set th eproperty name
                jThis.data.push(k);                                                                                         // We use a different ADD method
            }
            else {
                name="property_"+Object.keys(jThis.data).length;
                jThis.data[name]=k;
            }
            drawNode(jThis.level+1,name,jThis.data,k,jThis.eNode,jThis.host,"add");                                         // Add the value 
            jThis.host.onNotify("data",undefined,jThis.data,"added",name);    
        }
        return r;
    }
})();
