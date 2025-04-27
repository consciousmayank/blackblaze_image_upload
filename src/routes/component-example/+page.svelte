<script lang="ts">
	import B2ImageViewer from '$lib/components/B2ImageViewer.svelte';

	// Example of direct usage with a known filename
	let knownFileName = 'file_1745714659529.jpeg';

	// Example of dynamic usage
	let dynamicFileName = '';
	let showDynamicImage = false;

	// Define types for B2ImageViewer events
	interface LoadEventDetail {
		fileName: string;
	}

	interface ErrorEventDetail {
		error: string;
		fileName: string;
	}

	// Handle success event
	function handleImageLoad(event: CustomEvent<LoadEventDetail>) {
		console.log('Image loaded successfully:', event.detail.fileName);
	}

	// Handle error event
	function handleImageError(event: CustomEvent<ErrorEventDetail>) {
		console.error('Image load error:', event.detail.error);
	}

	// Toggle dynamic image
	function toggleDynamicImage() {
		showDynamicImage = !showDynamicImage;
	}
</script>

<div class="container">
	<h1>B2ImageViewer Component Examples</h1>

	<section class="example">
		<h2>Example 1: Direct Usage with Auto-Loading</h2>
		<p>This example automatically loads the image when the component mounts:</p>

		<div class="code-example">
			<pre>
&lt;B2ImageViewer 
  fileName="file_1234567890.jpg" 
  autoLoad={true} 
/&gt;</pre>
		</div>

		<div class="component-demo">
			<B2ImageViewer
				fileName={knownFileName}
				autoLoad={true}
				on:load={handleImageLoad}
				on:error={handleImageError}
			/>
		</div>
	</section>

	<section class="example">
		<h2>Example 2: Manual Loading with Button</h2>
		<p>This example shows the component with the manual load button:</p>

		<div class="code-example">
			<pre>
&lt;B2ImageViewer 
  fileName="file_1234567890.jpg" 
  autoLoad={false} 
/&gt;</pre>
		</div>

		<div class="component-demo">
			<B2ImageViewer
				fileName={knownFileName}
				autoLoad={false}
				on:load={handleImageLoad}
				on:error={handleImageError}
			/>
		</div>
	</section>

	<section class="example">
		<h2>Example 3: Dynamic File Names</h2>
		<p>This example demonstrates dynamic filename input:</p>

		<div class="input-group">
			<input type="text" bind:value={dynamicFileName} placeholder="Enter a file name" />
			<button on:click={toggleDynamicImage}>
				{showDynamicImage ? 'Hide Image' : 'Show Image'}
			</button>
		</div>

		{#if showDynamicImage}
			<div class="component-demo">
				<B2ImageViewer
					fileName={dynamicFileName}
					autoLoad={true}
					on:load={handleImageLoad}
					on:error={handleImageError}
				/>
			</div>
		{/if}
	</section>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}

	h1 {
		text-align: center;
		margin-bottom: 30px;
		color: #333;
	}

	.example {
		margin-bottom: 40px;
		padding: 20px;
		border: 1px solid #ddd;
		border-radius: 8px;
		background-color: #f9f9f9;
	}

	h2 {
		margin-bottom: 15px;
		color: #333;
		font-size: 1.3rem;
	}

	.code-example {
		background-color: #282c34;
		color: #abb2bf;
		padding: 15px;
		border-radius: 4px;
		margin-bottom: 15px;
		overflow-x: auto;
	}

	.code-example pre {
		margin: 0;
		font-family: 'Courier New', Courier, monospace;
	}

	.component-demo {
		padding: 15px;
		border: 1px dashed #ccc;
		border-radius: 4px;
		background-color: white;
	}

	.input-group {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;
	}

	input {
		flex: 1;
		padding: 8px;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	button {
		padding: 8px 15px;
		background-color: #4285f4;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background-color: #3367d6;
	}
</style>
