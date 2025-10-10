const fs = require('fs');
const path = require('path');

class FileCleanupService {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
  }

  // Clean up orphaned files (files not referenced in the database)
  async cleanupOrphanedFiles() {
    try {
      const { Match, Dispute } = require('../models');
      
      // Get all evidence URLs from matches and disputes
      const matches = await Match.findAll({ attributes: ['evidence_url'] });
      const disputes = await Dispute.findAll({ attributes: ['evidence_url'] });
      
      const usedFiles = new Set();
      
      // Collect all used file paths
      matches.forEach(match => {
        if (match.evidence_url) {
          const filename = path.basename(match.evidence_url);
          usedFiles.add(filename);
        }
      });
      
      disputes.forEach(dispute => {
        if (dispute.evidence_url) {
          const filename = path.basename(dispute.evidence_url);
          usedFiles.add(filename);
        }
      });
      
      // Get all files in uploads directory
      const files = fs.readdirSync(this.uploadsDir);
      
      // Delete orphaned files
      let deletedCount = 0;
      files.forEach(file => {
        if (!usedFiles.has(file)) {
          const filePath = path.join(this.uploadsDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted orphaned file: ${file}`);
        }
      });
      
      console.log(`File cleanup completed. Deleted ${deletedCount} orphaned files.`);
      
    } catch (error) {
      console.error('Error during file cleanup:', error);
    }
  }

  // Clean up files older than specified days
  cleanupOldFiles(daysOld = 30) {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      files.forEach(file => {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old file: ${file}`);
        }
      });
      
      console.log(`Old file cleanup completed. Deleted ${deletedCount} files older than ${daysOld} days.`);
      
    } catch (error) {
      console.error('Error during old file cleanup:', error);
    }
  }
}

module.exports = new FileCleanupService();