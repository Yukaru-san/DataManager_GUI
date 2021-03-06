package actions

import (
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strconv"

	jsprotocol "github.com/DataManager-Go/DataManagerGUI/jsProtocol"
	dmlib "github.com/DataManager-Go/libdatamanager"
	"github.com/asticode/go-astilectron"
	"github.com/atotto/clipboard"
)

type message struct {
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

type alertStruct struct {
	Type   string `json:"type"`
	Kind   string `json:"kind"`
	Strong string `json:"strongText"`
	Normal string `json:"normalText"`
}

// HandleMessages handles incoming messages from the JS
func HandleMessages(m *astilectron.EventMessage) (interface{}, error) {
	// Unmarshal into (json-)string
	var s string
	err := m.Unmarshal(&s)

	// Unmarshal into struct
	var ms message
	err = json.Unmarshal([]byte(s), &ms)
	if err != nil {
		return nil, err
	}

	switch ms.Type {
	case "download":
		{
			var data jsprotocol.DownloadStruct
			err = json.Unmarshal([]byte(ms.Payload)[1:len(ms.Payload)-1], &data)
			if err != nil {
				return nil, err
			}

			DownloadFiles(data.Files, DownloadDir)
			// TODO os.Getenv("download")
		}
	case "cancelDownload":
		{
			cancelDlChan <- true
		}
	case "changeNamespaceOrGroup":
		{
			// Parse payload json
			var info jsprotocol.NamespaceGroupInfo
			err = json.Unmarshal([]byte(ms.Payload), &info)

			// Receive initial files data
			var json string
			var err error
			attributes := dmlib.FileAttributes{Namespace: info.Namespace}

			if info.Group != "ShowAllFiles" {
				attributes.Groups = []string{info.Group}
			}

			json, err = GetFiles("", 0, false, attributes, 0)

			if err != nil {
				return nil, err
			}

			SendTags(info.Namespace)
			SendMessage("files", json, HandleResponses)
		}
	case "uploadFiles":
		{
			// Parse payload json
			var uploadInfo jsprotocol.UploadFilesStruct
			err = json.Unmarshal([]byte(ms.Payload), &uploadInfo)
			if err != nil {
				return nil, err
			}

			// Parse uploadInfo.Settings
			var uploadSettings jsprotocol.UploadInfoSettings
			err = json.Unmarshal([]byte(uploadInfo.Settings), &uploadSettings)
			if err != nil {
				return nil, err
			}

			UploadFiles(uploadInfo.Files, uploadSettings)
		}
	case "uploadDirectory":
		{
			// Parse payload json
			var uploadInfo jsprotocol.UploadDirectoryStruct
			err = json.Unmarshal([]byte(ms.Payload), &uploadInfo)
			if err != nil {
				return nil, err
			}

			// Parse uploadInfo.Settings
			var uploadSettings jsprotocol.UploadInfoSettings
			err = json.Unmarshal([]byte(uploadInfo.Settings), &uploadSettings)

			// TODO
			// UploadDirectory(uploadInfo.Path, uploadSettings)
			// UploadSuccess(4) -> plural = true on multiple directories (dunno if possible anyway lol)
		}
	case "cancelUpload":
		{
			uploadCancelChan <- true
		}
	/* RMB Events */
	case "copyPreviewURL":
		{
			err = clipboard.WriteAll(Config.GetPreviewURL(ms.Payload))
			if err != nil {
				fmt.Println("Error on URL Copy", err.Error())
				return false, err
			}

			return true, nil
		}
	case "previewFile":
		{
			id, err := strconv.ParseUint(ms.Payload, 10, 64)
			if err != nil {
				return nil, err
				// DownloadError(err.Error())
			}

			PreviewFile(uint(id))
		}
	case "unpublishFile":
		{
			var fileinfo jsprotocol.FileNamespaceStruct

			err = json.Unmarshal([]byte(ms.Payload), &fileinfo)
			if err != nil {
				return nil, err
			}

			fileID, err := strconv.ParseUint(fileinfo.File, 10, 64)
			if err != nil {
				return nil, err
			}

			_, err = Manager.UpdateFile("", uint(fileID), "", false, dmlib.FileChanges{
				SetPrivate: true,
			})
			if err != nil {
				return nil, err
			}
		}
	case "publishFile":
		{
			var fileinfo jsprotocol.FileNamespaceStruct

			err = json.Unmarshal([]byte(ms.Payload), &fileinfo)
			if err != nil {
				return nil, err
			}

			fileID, err := strconv.ParseUint(fileinfo.File, 10, 64)
			if err != nil {
				return nil, err
			}

			_, err = Manager.PublishFile("", uint(fileID), "", false, dmlib.FileAttributes{})
			if err != nil {
				return nil, err
			}

		}
	case "delete":
		{
			// Parse payload json
			var deletionInfo jsprotocol.DeleteInformation
			err = json.Unmarshal([]byte(ms.Payload), &deletionInfo)
			if err != nil {
				return nil, err
			}

			switch deletionInfo.Target {
			case "file":
				{
					for _, file := range deletionInfo.Files {
						err := DeleteFile(file)
						if err != nil {
							// DeleteError(err.Error())
							return nil, err
						}
					}

					if len(deletionInfo.Files) > 1 {
						DeleteSuccess(3, true)
					} else {
						DeleteSuccess(3, false)
					}

					LoadFiles(dmlib.FileAttributes{Namespace: deletionInfo.Namespace})
				}
			case "namespace":
				{
					_, err := Manager.DeleteNamespace(deletionInfo.Namespace)
					if err != nil {
						return nil, err
					}

					if len(deletionInfo.Files) > 1 {
						DeleteSuccess(0, true)
					} else {
						DeleteSuccess(0, false)
					}

					SendInitialData()
				}
			case "tag", "group":
				{
					// Pick right attribute
					attr := dmlib.TagAttribute
					val := deletionInfo.Tag
					if deletionInfo.Target == "group" {
						attr = dmlib.GroupAttribute
						val = deletionInfo.Group
					}

					_, err := Manager.DeleteAttribute(attr, deletionInfo.Namespace, val)
					if err != nil {
						return nil, err
					}

					if len(deletionInfo.Files) > 1 {
						if deletionInfo.Target == "tag" {
							DeleteSuccess(2, true)
						} else {
							DeleteSuccess(1, true)
						}
					} else {
						if deletionInfo.Target == "tag" {
							DeleteSuccess(2, false)
						} else {
							DeleteSuccess(1, false)
						}
					}

					// TODO pick correct one
					SendInitialData()
					LoadFiles(dmlib.FileAttributes{Namespace: deletionInfo.Namespace})
				}
			}

		}
	case "create":
		{
			// Parse payload json
			var creationInfo jsprotocol.CreateOrRenameInformation
			err = json.Unmarshal([]byte(ms.Payload), &creationInfo)
			if err != nil {
				return nil, err
			}

			switch creationInfo.Target {
			case "namespace":
				{
					_, err := Manager.CreateNamespace(creationInfo.Name)
					if err != nil {
						return nil, err
					}

					SendInitialData()
				}
			case "group":
				{
					// TODO
				}
			case "tag":
				{
					// TODO
				}
			}
		}
	case "rename":
		{
			// Parse payload json
			var renameInfo jsprotocol.CreateOrRenameInformation
			err = json.Unmarshal([]byte(ms.Payload), &renameInfo)
			if err != nil {
				return nil, err
			}

			switch renameInfo.Target {
			case "namespace":
				{
					_, err := Manager.UpdateNamespace(renameInfo.Namespace, renameInfo.Name)
					if err != nil {
						return nil, err
					}
					SendInitialData()
				}
			case "group", "tag":
				{
					attribute := dmlib.TagAttribute
					val := renameInfo.Tag
					if renameInfo.Target == "group" {
						attribute = dmlib.GroupAttribute
						val = renameInfo.Group
					}

					_, err := Manager.UpdateAttribute(attribute, renameInfo.Namespace, val, renameInfo.Name)
					if err != nil {
						return nil, err
					}

					SendInitialData()
					LoadFiles(dmlib.FileAttributes{Namespace: renameInfo.Namespace})
				}
			case "file":
				{
					// Parse string into uint
					fileID, err := strconv.ParseUint(renameInfo.FileID, 10, 64)
					if err != nil {
						return nil, err
					}

					// Update file
					_, err = Manager.UpdateFile("", uint(fileID), renameInfo.Namespace, false, dmlib.FileChanges{NewName: renameInfo.Name})
					if err != nil {
						return nil, err
					}

					// Refresh
					LoadFiles(dmlib.FileAttributes{Namespace: renameInfo.Namespace})
				}
			}
		}
	/* Keyboard Input */
	case "reload":
		{
			fmt.Println("Reload requested.")
			LoadFiles(dmlib.FileAttributes{Namespace: "Default"})
		}
	default:
		{
			fmt.Println("Unsupported request:", ms.Type, ms.Payload)
		}
	}

	return nil, nil
}

// HandleResponses handles potential answers on messages
func HandleResponses(m *astilectron.EventMessage) {
	// Unmarshal
	var s string
	m.Unmarshal(&s)

	// Process message
	log.Printf("received %s\n", s)
}

// SendMessage sends a message towards the javascript
func SendMessage(typ, payload string, responeHandler func(m *astilectron.EventMessage)) {
	b, _ := json.Marshal(&message{Type: typ, Payload: payload})
	Window.SendMessage(string(b), responeHandler)
}

// SendString sends a string towards the javascript
func SendString(s string, responeHandler func(m *astilectron.EventMessage)) {
	Window.SendMessage(s, responeHandler)
}

// SendAlert creates an alert inside of the GUI
// types: danger/warning/success/...
func SendAlert(typ, strongText, normalText string) {
	b, _ := json.Marshal(&alertStruct{Type: "alert", Kind: typ, Strong: strongText, Normal: normalText})
	Window.SendMessage(string(b))
}

// SendTags sends the gui all tags within the desired namespace
func SendTags(namespace string) {
	var tagContent []string
	tagResp, err := Manager.GetTags(namespace)

	if err == nil {
		for _, t := range tagResp {
			tagContent = append(tagContent, string(t))
		}
	}

	tagMsg := jsprotocol.TagList{User: Config.User.Username, Content: tagContent}
	tags, err := json.Marshal(tagMsg)

	if err == nil {
		fmt.Println(string(tags))
		SendMessage("tags", string(tags), HandleResponses)
	}
}

// SendInitialData sends the all initial data to the gui
func SendInitialData() error {
	nsResp, err := Manager.GetUserAttributeData()

	if err != nil {
		return err
	}

	// Sort by namespace name alphabetically
	sort.Sort(dmlib.SortByName(nsResp.Namespace))

	// A Slice of silces containing the namespace, followed by its groups
	var content [][]string
	defaultIndex := 0

	for i, nsData := range nsResp.Namespace {
		ns := make([]string, len(nsData.Groups)+1)

		// Ad namespace as first slice entry
		if nsData.Name[len(Config.User.Username)+1:] == "default" {
			defaultIndex = i
			ns[0] = "Default"
			defer SendTags(nsData.Name)
		} else {
			ns[0] = nsData.Name[len(Config.User.Username)+1:]
		}

		// Add groups
		for i := range nsData.Groups {
			ns[i+1] = nsData.Groups[i]
		}

		content = append(content, ns)
	}

	// Put default as first namespace
	content[defaultIndex], content[0] = content[0], content[defaultIndex]

	msg := jsprotocol.NamespaceGroupsList{User: Config.User.Username, Content: content}
	namespaces, err := json.Marshal(msg)
	fmt.Println(string(namespaces))

	if err == nil {
		SendMessage("namespace/groups", string(namespaces), HandleResponses)
	}

	return nil
}
