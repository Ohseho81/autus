# backend/autosync/registry/crm.py
# CRM/회계 시스템 매핑

CRM_SYSTEMS = {
    "hubspot": {
        "name": "HubSpot",
        "category": "crm",
        "detection": {
            "cookies": ["hubspotutk", "__hstc"],
            "domains": ["hubspot.com", "api.hubapi.com"]
        },
        "mapping": {
            "node_id": ["properties.hs_contact_id", "vid", "id"],
            "value": ["properties.hs_deal_amount", "properties.amount", "amount"],
            "timestamp": ["properties.createdate"]
        },
        "webhook_events": ["contact.creation", "deal.creation"]
    },
    
    "salesforce": {
        "name": "Salesforce",
        "category": "crm",
        "detection": {
            "cookies": ["sfdc_"],
            "domains": ["salesforce.com", "force.com", "lightning.force.com"]
        },
        "mapping": {
            "node_id": ["AccountId", "Id", "ContactId"],
            "value": ["Amount", "TotalPrice"],
            "timestamp": ["CreatedDate"]
        }
    },
    
    "zoho": {
        "name": "Zoho CRM",
        "category": "crm",
        "detection": {
            "domains": ["zoho.com", "crm.zoho.com"]
        },
        "mapping": {
            "node_id": ["Contact_Id", "id"],
            "value": ["Amount", "Grand_Total"],
            "timestamp": ["Created_Time"]
        }
    },
    
    "pipedrive": {
        "name": "Pipedrive",
        "category": "crm",
        "detection": {
            "domains": ["pipedrive.com"]
        },
        "mapping": {
            "node_id": ["person_id", "org_id"],
            "value": ["value", "amount"],
            "timestamp": ["add_time"]
        }
    },
    
    "quickbooks": {
        "name": "QuickBooks",
        "category": "accounting",
        "detection": {
            "domains": ["quickbooks.intuit.com", "api.intuit.com", "qbo.intuit.com"]
        },
        "mapping": {
            "node_id": ["CustomerRef.value", "VendorRef.value", "Id"],
            "value": ["TotalAmt", "Amount"],
            "timestamp": ["TxnDate", "MetaData.CreateTime"]
        }
    },
    
    "xero": {
        "name": "Xero",
        "category": "accounting",
        "detection": {
            "domains": ["xero.com", "api.xero.com", "go.xero.com"]
        },
        "mapping": {
            "node_id": ["ContactID", "InvoiceID"],
            "value": ["Total", "AmountDue", "AmountPaid"],
            "timestamp": ["DateString", "UpdatedDateUTC"]
        }
    }
}


# backend/autosync/registry/crm.py
# CRM/회계 시스템 매핑

CRM_SYSTEMS = {
    "hubspot": {
        "name": "HubSpot",
        "category": "crm",
        "detection": {
            "cookies": ["hubspotutk", "__hstc"],
            "domains": ["hubspot.com", "api.hubapi.com"]
        },
        "mapping": {
            "node_id": ["properties.hs_contact_id", "vid", "id"],
            "value": ["properties.hs_deal_amount", "properties.amount", "amount"],
            "timestamp": ["properties.createdate"]
        },
        "webhook_events": ["contact.creation", "deal.creation"]
    },
    
    "salesforce": {
        "name": "Salesforce",
        "category": "crm",
        "detection": {
            "cookies": ["sfdc_"],
            "domains": ["salesforce.com", "force.com", "lightning.force.com"]
        },
        "mapping": {
            "node_id": ["AccountId", "Id", "ContactId"],
            "value": ["Amount", "TotalPrice"],
            "timestamp": ["CreatedDate"]
        }
    },
    
    "zoho": {
        "name": "Zoho CRM",
        "category": "crm",
        "detection": {
            "domains": ["zoho.com", "crm.zoho.com"]
        },
        "mapping": {
            "node_id": ["Contact_Id", "id"],
            "value": ["Amount", "Grand_Total"],
            "timestamp": ["Created_Time"]
        }
    },
    
    "pipedrive": {
        "name": "Pipedrive",
        "category": "crm",
        "detection": {
            "domains": ["pipedrive.com"]
        },
        "mapping": {
            "node_id": ["person_id", "org_id"],
            "value": ["value", "amount"],
            "timestamp": ["add_time"]
        }
    },
    
    "quickbooks": {
        "name": "QuickBooks",
        "category": "accounting",
        "detection": {
            "domains": ["quickbooks.intuit.com", "api.intuit.com", "qbo.intuit.com"]
        },
        "mapping": {
            "node_id": ["CustomerRef.value", "VendorRef.value", "Id"],
            "value": ["TotalAmt", "Amount"],
            "timestamp": ["TxnDate", "MetaData.CreateTime"]
        }
    },
    
    "xero": {
        "name": "Xero",
        "category": "accounting",
        "detection": {
            "domains": ["xero.com", "api.xero.com", "go.xero.com"]
        },
        "mapping": {
            "node_id": ["ContactID", "InvoiceID"],
            "value": ["Total", "AmountDue", "AmountPaid"],
            "timestamp": ["DateString", "UpdatedDateUTC"]
        }
    }
}







