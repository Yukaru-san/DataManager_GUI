// This will wait for the astilectron namespace to be ready
document.addEventListener('astilectron-ready', function() {
    // This will listen to messages sent by GO
    astilectron.onMessage(function(message) {

        var obj = JSON.parse(message);

        // obj contents: obj.type, obj.payload
        if (obj.type === "namespace/groups") {
           addNamespaceAndGroups(obj);
        }
        else if (obj.type === "files") {
           listFiles(obj);
        }
        else if(obj.type === "tags") {
            addTags(obj);
        }

		return message;
    });
})

function addTags(data) {

}

function listFiles(data) {

    var parsed = JSON.parse(data.payload);

    for (var i = 0; i < parsed.length; i++) {

        var tr = document.createElement("tr");
        
        var id = document.createElement("td");
        var name = document.createElement("td");
        var publicName = document.createElement("td");
        var size = document.createElement("td");
        var date = document.createElement("td");
        var isPublic = document.createElement("td");

        id.innerHTML = parsed[i].id;

        if (parsed[i].name.length > 30) {
            name.innerHTML = parsed[i].name.substring(0,30) + "...";
        } else {
            name.innerHTML = parsed[i].name;
        }

        publicName.innerHTML = parsed[i].pubname;
        date.innerHTML = parsed[i].creation.substring(0, 10);
        isPublic.innerHTML = parsed[i].isPub;

        var byteSize = parsed[i].size;

        if (byteSize == 0) {
            size.innerHTML = byteSize + " byte"
        }
        else if (byteSize <= 1000) {
            size.innerHTML = byteSize + " bytes"
        } else if (byteSize <= 1000000) {
            size.innerHTML = (byteSize/1000).toFixed(2) + " KB"
        } else if (byteSize <= 1000000000) {
            size.innerHTML = (byteSize/1000000).toFixed(2) + " MB"
        } else {
            size.innerHTML = (byteSize/1000000000).toFixed(2) + " GB"
        }

        tr.appendChild(id);
        tr.appendChild(name);
        tr.appendChild(publicName);
        tr.appendChild(size);
        tr.appendChild(date);
        tr.appendChild(isPublic);

        document.getElementById("tableBody").appendChild(tr);
        makeTableHighlightable();
    }   

}

// TODO Work with respone from onClick Events json form : {"group":"name", "namespaceName":"namespace"}
function addNamespaceAndGroups(data) {
 // Payload content: `{"user":"Username", "content":[["Default", "Group1", "Group2"], ["Namespace2", "Group1"]]}`
    var parsed = JSON.parse(data.payload);
    var namespaces = parsed.content;
    document.getElementById("barTitle").innerHTML = parsed.user;

    for (var i = 0; i < namespaces.length; i++) {
    
        var groups = namespaces[i];

        // Add Namespaces
        var ns = document.createElement("LI");
        ns.setAttribute("class", "nav-item dropdown");
        ns.addEventListener("mousedown", OnListClick);

        var ns_a = document.createElement("a");
        
        ns_a.setAttribute("href", "#");
        ns_a.setAttribute("class", "dropdown-toggle nav-link text-left text-white py-1 px-0 position-relative");
        ns_a.setAttribute("data-toggle", "dropdown");
        ns_a.setAttribute("aria-expanded", "false");

        ns_a_i1 = document.createElement("i");
        ns_a_i1.setAttribute("class", "far fa-list-alt mx-3");
        ns_a.append(ns_a_i1);

        ns_a_span = document.createElement("span");
        ns_a_span.setAttribute("class", "text-nowrap mx-2");
        ns_a_span.innerHTML = groups[0];
        ns_a.append(ns_a_span);

        ns_a_i2 = document.createElement("i");
        ns_a_i2.setAttribute("class", "fas fa-caret-down float-none float-lg-right fa-sm");
        ns_a.append(ns_a_i2);

        ns.appendChild(ns_a);

        var div = document.createElement("div");
        div.setAttribute("class", "dropdown-menu border-0 animated fadeIn");
        div.setAttribute("role", "menu");
        ns.appendChild(div);

        // Add Groups to Namespaces
        for (var j = 0; j < groups.length; j++) {
            var div_a = document.createElement("a");
            div_a.setAttribute("class", "dropdown-item text-white");
            div_a.setAttribute("role", "presentation");
            div_a.setAttribute("href", "#");
            div.appendChild(div_a);

            var div_a_i = document.createElement("i");
            div_a.appendChild(div_a_i);

            var div_a_span = document.createElement("span");
            div_a.appendChild(div_a_span);

            if (j === 0) {
                div_a.setAttribute("id", `{"group":"ShowAllFiles", "namespace":"`+groups[0]+`"}`);
                div_a_i.setAttribute("class", "fas fa-list mx-3");
                div_a_span.innerHTML = "All files";
            } else {
                div_a.setAttribute("id", `{"group":"`+groups[j]+`", "namespace":"`+groups[0]+`"}`);
                div_a_i.setAttribute("class", "far fa-folder mx-3");
                div_a_span.innerHTML = groups[j];
            }
            div_a.addEventListener("click", OnListClick);
        }   
        
        // finally append to html
        document.getElementById("SideBar").appendChild(ns);
    }
}


/*
<li class="nav-item dropdown">
    <a class="dropdown-toggle nav-link text-left text-white py-1 px-0 position-relative" data-toggle="dropdown" aria-expanded="false" href="#">
        <i class="far fa-list-alt mx-3"></i>
        <span class="text-nowrap mx-2">Namespace2</span>
       <i class="fas fa-caret-down float-none float-lg-right fa-sm"></i>
    </a>

    <div class="dropdown-menu border-0 animated fadeIn" role="menu">
		<a class="dropdown-item text-white" role="presentation" href="#">
			<i class="far fa-folder mx-3"></i>
			<span>Folder 1</span>
         </a>
    </div>
 </li>

 https://stackoverflow.com/questions/24665677/call-javascript-function-by-clicking-on-html-list-element/24665785
*/