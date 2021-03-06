// This will wait for the astilectron namespace to be ready
document.addEventListener('astilectron-ready', function() {
    // This will listen to messages sent by GO
    astilectron.onMessage(function(message) {

        var obj = JSON.parse(message);

        // UI Elements
        if (obj.type === "namespace/groups") {
           addNamespaceAndGroups(obj);
        }
        else if (obj.type === "files") {
            // Delete potential former navigation buttons
            document.getElementById("buttonContainer").innerHTML = "";

            listFiles(obj);
        }
        else if(obj.type === "tags") {
            addTags(obj);
        }
        // Download
        else if (obj.type === "downloadProgress") {
            document.getElementById("dl_progressBar").style.width = obj.payload+"%"; 
        }
        else if (obj.type === "closeDownloadOverlay") {
            document.getElementById("downloadOverlay").style.display = "none";
        } 
        else if (obj.type === "openDownloadOverlay") {
            OpenDownloadOverlay(obj.payload);
        }
        // Upload
        else if (obj.type === "uploadProgress") {
            document.getElementById("up_progressBar").style.width = obj.payload+"%"; 
        }
        else if (obj.type === "closeUploadOverlay") {
            document.getElementById("uploadOverlay").style.display = "none";
        } 
        else if (obj.type === "openUploadOverlay") {
            OpenUploadOverlay(obj.payload);
        }
        // Alert
        else if (obj.type === "alert") {
            createAlert(obj.kind, obj.strongText, obj.normalText);    
        }

		return "";
    });
})

// add tags lists all received tags at the bottom of the document
function addTags(data) {
    tagList = [];

    // Remove potential former contents
    document.getElementById("tagList").innerHTML = "";

    var parsed = JSON.parse(data.payload).content;

    if (parsed === "undefined") { return; }

    for (var i = 0; i < parsed.length; i++) {
        var btn = document.createElement("button");
        btn.setAttribute("class", "btn btn-dark btn-sm text-left tagBtn");
        btn.setAttribute("type", "button");
        btn.setAttribute("style", "margin-right: 7px;background-color: rgb(18,24,31);");
        btn.innerHTML = parsed[i];
        btn.origColor = btn.style.backgroundColor;

        btn.addEventListener("click", function() {
            setTagFilter(this);
        });

        tagList.push(parsed[i]);
        document.getElementById("tagList").appendChild(btn);
    }
}

// listFiles will add up to 30 files to the body and preserve the rest
function listFiles(data) {
    // Remove potential former entries
    files = null;
    files = [];
    document.getElementById("tableBody").innerHTML = "";

    var parsed = JSON.parse(data.payload);

    // For every element: do cool html stuff
    for (var i = 0; i < parsed.length; i++) {

        // Generate
        var tr = document.createElement("tr");
        tr.setAttribute("class", "table_entry"); // used for right click events
        
        var id = document.createElement("td");
        var name = document.createElement("td");
        var publicName = document.createElement("td");
        var size = document.createElement("td");
        var date = document.createElement("td");
        var isPublic = document.createElement("td");

        // ID
        id.innerHTML = parsed[i].id;

        // Name
        if (parsed[i].name.length > 30) {
            name.innerHTML = parsed[i].name.substring(0,30) + "...";
        } else {
            name.innerHTML = parsed[i].name;
        }

        // Public Name
        publicName.innerHTML = parsed[i].pubname;
        if (!parsed[i].isPub) 
            publicName.style.color = "#9e9e9e";

        // Date
        date.innerHTML = parsed[i].creation.substring(0, 10);

        // Is Public
        isPublic.innerHTML = parsed[i].isPub;
        if (parsed[i].isPub) 
            isPublic.style.color = "green";
        else
            isPublic.style.color = "red";

        

        // Size
        var byteSize = parsed[i].size;

        if (byteSize == 1) {
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

        // Append
        tr.appendChild(id);
        tr.appendChild(name);
        tr.appendChild(publicName);
        tr.appendChild(size);
        tr.appendChild(date);
        tr.appendChild(isPublic);

        // Add tags
        if (parsed[i].attrib.tags !== undefined) {
            tr.tags = parsed[i].attrib.tags;
        }

        files.push(tr)
    }
    
    // Load files again
    switch(currentlySorted) {
        case "id":
            sortTableByID(false);
            break;
        case "name":
            sortTableByName(false);
            break;
        case "size":
            sortTableBySize(false); 
            break;
        case "date":
            sortTableByCreationDate(false);
            break;
        case "isPublic":
            sortTableByIsPublic(false);
            break;

        default:
            loadPage(1);
            break;
    }
}

function addNamespaceAndGroups(data) {

    // Remove potential former entries
    var sidebarElement = document.getElementById("SideBar")
    while (sidebarElement.lastChild.classList !== undefined && sidebarElement.lastChild.classList[2] == "nsListEntry") {
        sidebarElement.removeChild(sidebarElement.lastChild);
    }

    var parsed = JSON.parse(data.payload);

    var namespaces = parsed.content;
    document.getElementById("barTitle").innerHTML = parsed.user;

    if ($(window).height() < 70 * namespaces.length) {
        document.getElementById("SideBar").classList.remove("flex-column");
    }
    namespaceCount = namespaces.length;

    for (var i = 0; i < namespaces.length; i++) {
    
        var groups = namespaces[i];

        // Add Namespaces
        var ns = document.createElement("LI");
        ns.setAttribute("class", "nav-item dropdown nsListEntry");
        ns.setAttribute("style", "width: 100%;");

        var ns_a = document.createElement("a");
        ns_a.setAttribute("href", "#");
        ns_a.setAttribute("class", "dropdown-toggle nav-link text-left text-white py-1 px-0 position-relative namespace");
        ns_a.setAttribute("data-toggle", "dropdown");
        ns_a.setAttribute("aria-expanded", "false"); 
        ns_a.setAttribute("id","namespaceParent_collapsed");
        ns_a.addEventListener("mouseup", AdjustSubentriesInListLength);    

        ns_a_i1 = document.createElement("i");
        ns_a_i1.setAttribute("class", "far fa-list-alt mx-3");
        ns_a.append(ns_a_i1);

        ns_a_span = document.createElement("span");
        ns_a_span.setAttribute("class", "text-nowrap mx-2");

        var name = groups[0];
        if (name.length > 14) {name = name.substring(0,14)+"..."}

        ns_a_span.innerHTML = name;
        ns_a.append(ns_a_span);

        ns_a_i2 = document.createElement("i");
        ns_a_i2.setAttribute("class", "fas fa-caret-down float-none float-lg-right fa-sm");
        ns_a.append(ns_a_i2);

        ns.appendChild(ns_a);

        var div = document.createElement("div");
        div.setAttribute("class", "dropdown-menu border-0 animated fadeIn");
        div.setAttribute("role", "menu");
        ns.appendChild(div);

        // User to lower case
        parsed.user = parsed.user.toLowerCase();

        // Add Groups to Namespaces
        for (var j = 0; j < groups.length; j++) {
            var div_a = document.createElement("a");
            if (j === 0)
                div_a.setAttribute("class", "dropdown-item text-white allFiles");
            else
                div_a.setAttribute("class", "dropdown-item text-white group");
            div_a.setAttribute("role", "presentation");
            div_a.setAttribute("href", "#");
            div.appendChild(div_a);

            var div_a_i = document.createElement("i");
            div_a.appendChild(div_a_i);
            
            var div_a_span = document.createElement("span");
            div_a.appendChild(div_a_span);
            
            if (groups[0] === "Default") {groups[0] = parsed.user+"_default";}
            else if (j === 0) {groups[0] = parsed.user+"_"+groups[0];}


            if (j === 0) {
                div_a.setAttribute("id", `{"group":"ShowAllFiles", "namespace":"`+groups[0]+`"}`);
                div_a_i.setAttribute("class", "fas fa-list mx-3");
                div_a_i.setAttribute("id", `{"group":"ShowAllFiles", "namespace":"`+groups[0]+`"}`);
                div_a_span.setAttribute("id", `{"group":"ShowAllFiles", "namespace":"`+groups[0]+`"}`);
                div_a_span.innerHTML = "All files";
            } else {
                div_a.setAttribute("id", `{"group":"`+groups[j]+`", "namespace":"`+groups[0]+`"}`);
                div_a_i.setAttribute("class", "far fa-folder mx-3");
                div_a_i.setAttribute("id", `{"group":"`+groups[j]+`", "namespace":"`+groups[0]+`"}`);
                div_a_span.innerHTML = groups[j];
                div_a_span.setAttribute("id", `{"group":"`+groups[j]+`", "namespace":"`+groups[0]+`"}`);
    
                if (groups[0] === parsed.user+"_default")
                    groupList.push(groups[j]);
            }
            div_a.addEventListener("click", OnListClick);
        }   
        
        // finally append to html
        document.getElementById("SideBar").appendChild(ns);
    }
}
