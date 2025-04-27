<script lang="ts">
  import B2ImageViewer from '../../components/B2ImageViewer.svelte';
  
  let fileName = '';
  let showImage = false;

  function handleSubmit() {
    showImage = true;
  }

  function handleReset() {
    fileName = '';
    showImage = false;
  }
</script>

<div class="download-container">
  <h1>View Image</h1>
  
  <form on:submit|preventDefault={handleSubmit} class="form-container">
    <div class="form-group">
      <label for="fileName">Enter File Name:</label>
      <input 
        type="text" 
        id="fileName" 
        bind:value={fileName} 
        placeholder="e.g., file_1234567890.jpg"
      />
    </div>
    
    <div class="buttons">
      <button type="submit" disabled={!fileName}>
        View Image
      </button>
      
      <button type="button" class="reset-button" on:click={handleReset}>
        Reset
      </button>
    </div>
  </form>
  
  {#if showImage}
    <div class="viewer-container">
      <B2ImageViewer 
        fileName={fileName} 
        autoLoad={true}
        on:load={() => {}} 
        on:error={(e) => console.error('Error loading image:', e.detail)}
      />
    </div>
  {/if}
</div>

<style>
  .download-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  h1 {
    text-align: center;
    margin-bottom: 20px;
  }
  
  .form-container {
    margin-bottom: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .buttons {
    display: flex;
    gap: 10px;
  }
  
  button {
    flex: 1;
    padding: 10px;
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }
  
  button:hover {
    background-color: #3367d6;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .reset-button {
    background-color: #757575;
  }
  
  .reset-button:hover {
    background-color: #616161;
  }
  
  .viewer-container {
    margin-top: 20px;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 4px;
    background-color: #f9f9f9;
  }
</style> 