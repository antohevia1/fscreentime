import { useState } from 'react';
import './FileUpload.css';

function FileUpload({ apiUrl, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['application/json', 'application/octet-stream'];
    const validExtensions = ['.json', '.parquet'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setMessage('Please upload a JSON or Parquet file');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result.split(',')[1];
        
        const response = await fetch(`${apiUrl}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content,
            contentType: file.type || 'application/octet-stream',
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          setMessage('✓ File uploaded successfully!');
          onUploadSuccess();
          event.target.value = '';
        } else {
          setMessage(`Error: ${result.error}`);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <h2>Upload Screen Time Data</h2>
      <div className="upload-area">
        <input
          type="file"
          id="file-input"
          accept=".json,.parquet"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label htmlFor="file-input" className={uploading ? 'disabled' : ''}>
          {uploading ? 'Uploading...' : '📁 Choose File (JSON or Parquet)'}
        </label>
      </div>
      {message && (
        <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
