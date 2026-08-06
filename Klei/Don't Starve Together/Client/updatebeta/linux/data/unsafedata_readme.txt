The unsafedata folder is where io.open(path, "w") operations are permitted to work.
The data written here may be done by mods and should be considered with care this directory is flat.
Example: io.open("unsafedata/mymodnamehere_data.txt", "w")

The following file extensions are permitted to be used with io.open in write mode:
.txt, .tex, .xml, .png, .json
