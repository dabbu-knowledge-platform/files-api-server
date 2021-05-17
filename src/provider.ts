// All data providers must implement this interface
export default interface DataProvider {
	// List files and folders at a particular folder path
	list(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
	): Promise<DabbuResponse>

	// Return information about the file at the specified location
	read(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
	): Promise<DabbuResponse>

	// Upload a file to the specified location
	create(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
		fileMetadata: MulterFile,
	): Promise<DabbuResponse>

	// Update the file at the specified location
	update(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
		fileMetadata: MulterFile,
	): Promise<DabbuResponse>

	// Delete the file/folder at the specified location
	delete(
		parameters: Record<string, any>,
		queries: Record<string, any>,
		body: Record<string, any>,
		headers: Record<string, any>,
		creds: Client,
	): Promise<DabbuResponse>
}
