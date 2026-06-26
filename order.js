(function () {
    var draftKey = "ecc_order_draft";
    var submissionKey = "ecc_order_submission";
    var historyKey = "ecc_order_history";
    var firestoreDb = null;
    var firestoreOrdersCollection = null;
    var useFirestore = false;

    function readField(id) {
        var element = document.getElementById(id);
        return element ? element.value.trim() : "";
    }

    function writeField(id, value) {
        var element = document.getElementById(id);
        if (element && typeof value === "string") {
            element.value = value;
        }
    }

    function readDraft() {
        try {
            return JSON.parse(localStorage.getItem(draftKey)) || {};
        } catch (error) {
            return {};
        }
    }

    function saveDraft(draft) {
        localStorage.setItem(draftKey, JSON.stringify(draft));
    }

    function saveSubmission(submission) {
        localStorage.setItem(submissionKey, JSON.stringify(submission));
    }

    function readHistory() {
        try {
            return JSON.parse(localStorage.getItem(historyKey)) || [];
        } catch (error) {
            return [];
        }
    }

    function saveHistory(history) {
        localStorage.setItem(historyKey, JSON.stringify(history));
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getMessageTarget() {
        return document.getElementById("formMessage");
    }

    function setMessage(message) {
        var target = getMessageTarget();
        if (target) {
            target.textContent = message;
        }
    }

    function hydrateForm() {
        var draft = readDraft();
        writeField("u_name", draft.name || "");
        writeField("e_mail", draft.email || "");
        writeField("address", draft.address || "");
        writeField("order_notes", draft.notes || "");
    }

    function getSingleService() {
        var select = document.getElementById("o_order");
        if (!select || select.value === "none") {
            return "";
        }
        return select.value.trim();
    }

    function getBundleServices() {
        var checked = document.querySelectorAll('input[name="service_option"]:checked');
        var services = [];
        for (var index = 0; index < checked.length; index += 1) {
            services.push(checked[index].value.trim());
        }
        return services;
    }

    function readCommonData() {
        return {
            name: readField("u_name"),
            email: readField("e_mail"),
            address: readField("address"),
            notes: readField("order_notes")
        };
    }

    function validateCommonData(data) {
        if (!data.name || !data.email || !data.address) {
            setMessage("Please fill in your name, email, and address.");
            return false;
        }
        return true;
    }

    function hasFirebaseConfig() {
        var config = window.ECC_FIREBASE_CONFIG;
        if (!config || !window.firebase) {
            return false;
        }

        return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
    }

    function initializeFirestore() {
        if (!hasFirebaseConfig()) {
            useFirestore = false;
            return;
        }

        if (firestoreDb) {
            useFirestore = true;
            return;
        }

        try {
            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(window.ECC_FIREBASE_CONFIG);
            }
            firestoreDb = window.firebase.firestore();
            firestoreOrdersCollection = firestoreDb.collection("orders");
            useFirestore = true;
        } catch (error) {
            firestoreDb = null;
            firestoreOrdersCollection = null;
            useFirestore = false;
            console.error("Firebase initialization failed:", error);
        }
    }

    function mapFirestoreDoc(doc) {
        var data = doc.data() || {};
        return {
            id: doc.id,
            createdAt: data.createdAt || "",
            mode: data.mode || "single",
            name: data.name || "",
            email: data.email || "",
            address: data.address || "",
            notes: data.notes || "",
            services: Array.isArray(data.services) ? data.services : []
        };
    }

    function sortOrdersDescending(orders) {
        return orders.sort(function (left, right) {
            var leftValue = left.createdAt || "";
            var rightValue = right.createdAt || "";
            if (leftValue === rightValue) {
                return 0;
            }
            return leftValue > rightValue ? -1 : 1;
        });
    }

    function getStoredOrders() {
        if (useFirestore && firestoreOrdersCollection) {
            return firestoreOrdersCollection
                .orderBy("createdAt", "desc")
                .get()
                .then(function (snapshot) {
                    var orders = [];
                    snapshot.forEach(function (doc) {
                        orders.push(mapFirestoreDoc(doc));
                    });
                    return orders;
                })
                .catch(function (error) {
                    console.error("Could not load orders from Firestore:", error);
                    return sortOrdersDescending(readHistory());
                });
        }

        return Promise.resolve(sortOrdersDescending(readHistory()));
    }

    function persistOrder(order) {
        if (useFirestore && firestoreOrdersCollection) {
            return firestoreOrdersCollection
                .add(order)
                .then(function (docRef) {
                    return {
                        id: docRef.id,
                        createdAt: order.createdAt,
                        mode: order.mode,
                        name: order.name,
                        email: order.email,
                        address: order.address,
                        notes: order.notes,
                        services: order.services
                    };
                })
                .catch(function (error) {
                    console.error("Could not save order to Firestore:", error);
                    return persistOrderLocally(order);
                });
        }

        return Promise.resolve(persistOrderLocally(order));
    }

    function persistOrderLocally(order) {
        var history = readHistory();
        var entry = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            createdAt: order.createdAt,
            mode: order.mode,
            name: order.name,
            email: order.email,
            address: order.address,
            notes: order.notes,
            services: order.services
        };

        history.unshift(entry);
        saveHistory(history);
        saveSubmission(entry);
        return entry;
    }

    function updateLatestSubmission(order) {
        saveSubmission(order);
    }

    function formatTimestamp(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) {
            return "Unknown time";
        }

        return date.toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function renderSummary() {
        var summary = document.getElementById("orderSummary");
        if (!summary) {
            return Promise.resolve();
        }

        return getStoredOrders().then(function (orders) {
            var submission = orders.length > 0 ? orders[0] : {};

            if (!submission.name) {
                summary.innerHTML = "<h3>Order summary</h3><p class='form-help'>No recent order was found. Start a new request from the order page.</p>";
                return;
            }

            var modeLabel = submission.mode === "bundle" ? "Bundle request" : "Single-service request";
            var serviceList = (submission.services || []).join(", ");

            summary.innerHTML = [
                "<h3>Order summary</h3>",
                "<p class='form-help'>" + modeLabel + "</p>",
                "<ul class='summary-list'>",
                "<li class='summary-item'><span class='summary-label'>Name</span><span class='summary-value'>" + escapeHtml(submission.name) + "</span></li>",
                "<li class='summary-item'><span class='summary-label'>Email</span><span class='summary-value'>" + escapeHtml(submission.email) + "</span></li>",
                "<li class='summary-item'><span class='summary-label'>Address</span><span class='summary-value'>" + escapeHtml(submission.address) + "</span></li>",
                "<li class='summary-item'><span class='summary-label'>Services</span><span class='summary-value'>" + escapeHtml(serviceList) + "</span></li>",
                submission.notes ? "<li class='summary-item'><span class='summary-label'>Notes</span><span class='summary-value'>" + escapeHtml(submission.notes) + "</span></li>" : "",
                "</ul>"
            ].join("");
        });
    }

    function renderOrdersBoard() {
        var board = document.getElementById("ordersList");
        var countTarget = document.getElementById("orderCount");
        if (!board) {
            return Promise.resolve();
        }

        return getStoredOrders().then(function (orders) {
            if (countTarget) {
                countTarget.textContent = String(orders.length);
            }

            if (orders.length === 0) {
                board.innerHTML = "<div class='empty-state'>No orders have been submitted yet.</div>";
                return;
            }

            var markup = [];
            for (var index = 0; index < orders.length; index += 1) {
                var entry = orders[index];
                markup.push([
                    "<article class='order-entry'>",
                    "<div class='order-entry-header'>",
                    "<div>",
                    "<h3 class='order-entry-title'>" + escapeHtml(entry.name) + "</h3>",
                    "<div class='order-entry-time'>" + escapeHtml(formatTimestamp(entry.createdAt)) + "</div>",
                    "</div>",
                    "<button type='button' class='btn btn-outline-accent btn-xs' aria-label='Delete order' title='Delete order' onclick=\"deleteOrder(" + JSON.stringify(entry.id) + ")\"><i class='fa fa-trash'></i></button>",
                    "</div>",
                    "<div class='summary-list'>",
                    "<div class='summary-item'><span class='summary-label'>Mode</span><span class='summary-value'>" + escapeHtml(entry.mode === "bundle" ? "Bundle" : "Single") + "</span></div>",
                    "<div class='summary-item'><span class='summary-label'>Email</span><span class='summary-value'>" + escapeHtml(entry.email) + "</span></div>",
                    "<div class='summary-item'><span class='summary-label'>Address</span><span class='summary-value'>" + escapeHtml(entry.address) + "</span></div>",
                    "</div>",
                    "<ul class='order-tags'>"
                ].join(""));

                for (var serviceIndex = 0; serviceIndex < entry.services.length; serviceIndex += 1) {
                    markup.push("<li class='order-tag'>" + escapeHtml(entry.services[serviceIndex]) + "</li>");
                }

                markup.push("</ul>");

                if (entry.notes) {
                    markup.push("<div class='callout'>" + escapeHtml(entry.notes) + "</div>");
                }

                markup.push("</article>");
            }

            board.innerHTML = markup.join("");
        });
    }

    function submitOrder() {
        var commonData = readCommonData();
        var bundleServices = getBundleServices();
        var singleService = getSingleService();

        if (!validateCommonData(commonData)) {
            return;
        }

        var order = {
            createdAt: new Date().toISOString(),
            mode: bundleServices.length > 0 ? "bundle" : "single",
            name: commonData.name,
            email: commonData.email,
            address: commonData.address,
            notes: commonData.notes,
            services: bundleServices.length > 0 ? bundleServices : [singleService]
        };

        if (order.mode === "single" && !singleService) {
            setMessage("Please choose a service before submitting.");
            return;
        }

        saveDraft(commonData);
        setMessage(order.mode === "bundle" ? "Bundle saved. Redirecting to the confirmation page..." : "Order saved. Redirecting to the confirmation page...");

        persistOrder(order).then(function () {
            updateLatestSubmission(order);
            window.location = "order2.html";
        });
    }

    function goToBundleForm() {
        var commonData = readCommonData();
        saveDraft(commonData);
        window.location = "order3.html";
    }

    function goToSingleForm() {
        var commonData = readCommonData();
        saveDraft(commonData);
        window.location = "order.html";
    }

    function clearOrders() {
        if (useFirestore && firestoreOrdersCollection) {
            firestoreOrdersCollection
                .get()
                .then(function (snapshot) {
                    var batch = firestoreDb.batch();
                    snapshot.forEach(function (doc) {
                        batch.delete(doc.ref);
                    });
                    return batch.commit();
                })
                .then(function () {
                    localStorage.removeItem(historyKey);
                    localStorage.removeItem(submissionKey);
                    return Promise.all([renderSummary(), renderOrdersBoard()]);
                })
                .catch(function (error) {
                    console.error("Could not clear Firestore orders:", error);
                });
            return;
        }

        localStorage.removeItem(historyKey);
        localStorage.removeItem(submissionKey);
        renderSummary();
        renderOrdersBoard();
    }

    function deleteOrder(orderId) {
        if (useFirestore && firestoreOrdersCollection) {
            firestoreOrdersCollection
                .doc(orderId)
                .delete()
                .then(function () {
                    return Promise.all([renderSummary(), renderOrdersBoard()]);
                })
                .catch(function (error) {
                    console.error("Could not delete Firestore order:", error);
                });
            return;
        }

        var history = readHistory();
        var filtered = [];
        for (var index = 0; index < history.length; index += 1) {
            if (history[index].id !== orderId) {
                filtered.push(history[index]);
            }
        }

        saveHistory(filtered);
        if (filtered.length > 0) {
            saveSubmission(filtered[0]);
        } else {
            localStorage.removeItem(submissionKey);
        }
        renderSummary();
        renderOrdersBoard();
    }

    function bindGlobals() {
        window.order = submitOrder;
        window.m = goToBundleForm;
        window.coo = goToSingleForm;
        window.clearOrders = clearOrders;
        window.deleteOrder = deleteOrder;
    }

    document.addEventListener("DOMContentLoaded", function () {
        initializeFirestore();
        hydrateForm();
        bindGlobals();
        renderSummary();
        renderOrdersBoard();
    });
})();
