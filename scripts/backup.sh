#!/bin/bash
tar czf backup_$(date +%F).tar.gz /data/autus
openssl enc -aes-256-cbc -salt -in backup_$(date +%F).tar.gz -out backup_$(date +%F).tar.gz.enc -k $BACKUP_KEY
