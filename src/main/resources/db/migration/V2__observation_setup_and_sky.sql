-- Legacy equipment stays intact: a combined note cannot safely be split automatically.
ALTER TABLE observations
  ADD COLUMN telescope VARCHAR(160),
  ADD COLUMN camera VARCHAR(160),
  ADD COLUMN latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  ADD COLUMN seeing DOUBLE PRECISION CHECK (seeing BETWEEN 0.01 AND 100),
  ADD COLUMN cloud_cover DOUBLE PRECISION CHECK (cloud_cover BETWEEN 0 AND 100),
  ADD COLUMN humidity DOUBLE PRECISION CHECK (humidity BETWEEN 0 AND 100),
  ADD CONSTRAINT observations_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL));
