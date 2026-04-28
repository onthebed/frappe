context("List View", () => {
	before(() => {
		cy.login();
		cy.visit("/desk/website");
		return cy
			.window()
			.its("frappe")
			.then((frappe) => {
				return frappe.xcall("frappe.tests.ui_test_helpers.setup_workflow");
			});
	});

	it("Keep checkbox checked after Refresh", { scrollBehavior: false }, () => {
		cy.go_to_list("ToDo");
		cy.clear_filters();
		cy.get(".list-header-subject .list-subject .list-check-all").click();
		cy.get("button[data-original-title='Reload List']").click();
		cy.get(".list-row-container .list-row-checkbox:checked").should("be.visible");
	});

	it('enables "Actions" button', { scrollBehavior: false }, () => {
		const actions = [
			"Approve",
			"Reject",
			"Copy to Clipboard",
			"Export",
			"Assign To",
			"Clear Assignment",
			"Apply Assignment Rule",
			"Add Tags",
			"Print",
		];
		cy.go_to_list("ToDo");
		cy.clear_filters();
		cy.get(".list-header-subject .list-subject .list-check-all").click();
		cy.findByRole("button", { name: "Actions" }).click();
		cy.get(".dropdown-menu li:visible .dropdown-item")
			.should("have.length", 9)
			.each((el, index) => {
				cy.wrap(el).contains(actions[index]);
			})
			.then((elements) => {
				cy.intercept({
					method: "POST",
					url: "api/method/frappe.model.workflow.bulk_workflow_approval",
				}).as("bulk-approval");
				cy.wrap(elements).contains("Approve").click();
				cy.wait("@bulk-approval");
				cy.hide_dialog();
				cy.reload();
				cy.clear_filters();
				cy.get(".list-row-container:visible").should("contain", "Approved");
			});
	});

	it("Adds a button to each list view row", () => {
		// Get a ToDo with a reference name
		cy.call("frappe.client.get_value", {
			doctype: "ToDo",
			filters: {
				reference_name: ["is", "set"],
			},
			fieldname: "name",
		}).then((r) => {
			const todo_name = r.message.name;
			cy.go_to_list("ToDo");

			// Check if the 'Open' button is present in the ToDo list view
			cy.get(`.btn-default[data-name="${todo_name}"]`)
				.scrollIntoView({ inline: "center", block: "nearest" })
				.should("be.visible")
				.click();

			cy.window()
				.its("cur_frm")
				.then((frm) => {
					// Routes to the reference document
					expect(frm.doc.doctype).to.equal("ToDo");
					expect(frm.doc.name).to.not.equal(todo_name);
				});
		});
	});
});

context("List View Check Filters", () => {
	before(() => {
		cy.login();
		cy.visit("/desk/doctype");
		return cy
			.window()
			.its("frappe")
			.then((frappe) => {
				return frappe.xcall("frappe.tests.ui_test_helpers.create_doctype", {
					name: "Test List Check Filter",
					fields: [
						{
							label: "Title",
							fieldname: "title",
							fieldtype: "Data",
							in_list_view: 1,
							reqd: 1,
						},
						{
							label: "Enabled",
							fieldname: "enabled",
							fieldtype: "Check",
							in_list_view: 1,
							in_standard_filter: 1,
						},
					],
				});
			})
			.then(() => {
				return cy.insert_doc("Test List Check Filter", {
					title: "Enabled Row",
					enabled: 1,
				});
			})
			.then(() => {
				return cy.insert_doc("Test List Check Filter", {
					title: "Disabled Row",
					enabled: 0,
				});
			});
	});

	it("applies check filters with a falsey value", () => {
		cy.window().then((win) => {
			win.frappe.route_options = { enabled: 0 };
			win.frappe.set_route("List", "Test List Check Filter");
		});

		cy.get(".list-row-container .list-row").should("have.length", 1);
		cy.get(".list-row-container").should("contain", "Disabled Row");
	});
});
