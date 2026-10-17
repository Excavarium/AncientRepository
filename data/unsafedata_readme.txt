unsafedata is where io.open(path, "w") operations are permitted to work. This directory is flat. 
Example: io.open("unsafedata/mymodnamehere_data.txt", "w")

The folder actually lives in the save directory:
  Windows: Documents/Klei/DoNotStarveTogether/<userid>/client_save/unsafedata/
  macOS:   ~/Documents/Klei/DoNotStarveTogether/<userid>/client_save/unsafedata/
  Linux:   ~/.klei/DoNotStarveTogether/<userid>/client_save/unsafedata/
  Dedicated server: <cluster>/<shard>/save/unsafedata/
The engine maps every "unsafedata/..." path there for reads and writes.

The following file extensions are permitted to be used with io.open in write mode:
.txt, .tex, .xml, .png, .json
