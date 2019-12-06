// import * as THREE from 'three';

const THREE = require("three");

/*

usage:

where each point is { x:..., y:..., z:... }

const calibrator = new Calibrator( array of fixed points in your world [...]);

calibrator.addCalibrationPoint(controller point 1);
calibrator.addCalibrationPoint(controller point 2);

translation = calibrator.calibrate();

*/

class Calibrator {

    constructor(fixedPoints) {
        
        this.fixedPoints = [];

        for (let i = 0; i < fixedPoints.length; i++) {
            this.fixedPoints.push(new THREE.Vector3(fixedPoints[i][0], fixedPoints[i][1], fixedPoints[i][2]));
        }

    }

    // calculates the covariance matrix of the x and z components of a set of points
    // float[,] covariance(Vector3[] points) {
    //     //  first calculate centroid
    //     let avg_x = 0.0;
    //     let avg_z = 0.0;

    //     foreach (Vector3 p in points) {
    //         avg_x += p.x / points.Length;
    //         avg_z += p.z / points.Length;
    //     }

    //     // compute covariance between x and z components
    //     float var_xx = 0f;
    //     float var_zz = 0f;
    //     float var_xz = 0f;
    //     foreach (Vector3 p in points) {
    //         var_xx += (p.x - avg_x) * (p.x - avg_x) / points.Length;
    //         var_zz += (p.z - avg_z) * (p.z - avg_z) / points.Length;
    //         var_xz += (p.x - avg_x) * (p.z - avg_z) / points.Length;
    //     }

    //     // return as a matrix
    //     float[,] res = new float[,]
    //     {
    //         { var_xx, var_xz }, { var_xz, var_zz}
    //     };
    //     return res;
    // }

    // // calculates the eigenvectors of a covariance matrix
    // float[,] eigenvectors(float[,] covariance_matrix) {
    //     float a = covariance_matrix[0, 0];
    //     float b = covariance_matrix[1, 0];
    //     float c = covariance_matrix[0, 1];
    //     float d = covariance_matrix[1, 1];

    //     // determinant and trace
    //     float D = a * d - b * c;
    //     float T = a + d;

    //     // eigenvalues
    //     float e1 = T / 2f + Mathf.Sqrt(T * T / 4f - D);
    //     float e2 = T / 2f - Mathf.Sqrt(T * T / 4f - D);

    //     // calculate eigenvectors and return
    //     // <e[0, 0], e[0, 1]> is the first eigenvector, <e[1, 0], e[1, 1]> is the second
    //     float[,] res = new float[2, 2];
    //     if (c != 0) {
    //         res[0, 0] = e1 - d;
    //         res[0, 1] = c;
    //         res[1, 0] = e2 - d;
    //         res[1, 1] = c;
    //     } else if (b != 0) {
    //         res[0, 0] = e1 - a;
    //         res[0, 1] = b;
    //         res[1, 0] = e2 - a;
    //         res[1, 1] = b;
    //     } else {
    //         res[0, 0] = 1f;
    //         res[0, 1] = 0f;
    //         res[1, 0] = 0f;
    //         res[1, 1] = 1f;
    //     }
    //     return res;
    // }

    // calculates the "angle" of a set of points based on the angle between the x-axis of the scene and
    // the eigenvector of the set which corresponds to its x-axis
    // float pointSetAngle(Vector3[] points) {
    //     float[,] e = eigenvectors(covariance(points));
    //     Vector3 eigenvector = new Vector3(e[0, 0], 0f, e[0, 1]);
    //     float angle = Vector3.SignedAngle(Vector3.right, eigenvector, Vector3.up);

    //     // this handles the degeneracy of two possible solutions; we always anchor based on the first point of the set
    //     // this assumes the first point is constant relative to the other points in the set
    //     if (Vector3.Dot(Vector3.Normalize(eigenvector), Vector3.Normalize(points[0])) < 0f) angle += 180f;
    //     return angle;
    // }

    // gets the centroid of a set of points
    centroid(points) {

        let cent = new THREE.Vector3(0., 0., 0.);
        const n = points.length;

        points.forEach(function(p) {
            cent.add(p.divideScalar(n));
        });

        return cent;
    }

    calibrate(inputPoints) {
        // invalid set of points
        if (this.fixedPoints.length != inputPoints.length) {
            return null;
        }
        
        let npoints = [];
        for (let i = 0; i < inputPoints.length; i++) {
            npoints.push(new THREE.Vector3(inputPoints[i][0], inputPoints[i][1], inputPoints[i][2]));
        }
        inputPoints = npoints;

        inputPoints[0].y = 0.0;
        inputPoints[1].y = 0.0;

        // first calculate the centroids of the two lines
        let realCentroid = this.centroid(this.fixedPoints);
        let inputCentroid = this.centroid(inputPoints);

        // calculate the angle between the lines
        let theta = 0.0;
        const v_real = this.fixedPoints[1].sub(this.fixedPoints[0]);
        const v_obs = inputPoints[1].sub(inputPoints[0]);

        v_real.normalize();
        v_obs.normalize();

        // theta = this.signedAngle(v_obs, v_real, new THREE.Vector3(0.0, 1.0, 0.0));
        theta = v_obs.angleTo(v_real);
        // // given differences in line angle and centroid, we can calulcate the offset to put our headset in global coordinate system
        // root.transform.rotation = Quaternion.Euler(0.0, theta, 0.0);
        // root.transform.position = root.transform.rotation * (realCentroid - inputCentroid);
        // inputPoints = [];

        // // update the guardian data and save it
        // guardianAngle = pointSetAngle(OVRManager.boundary.GetGeometry(OVRBoundary.BoundaryType.OuterBoundary)) + root.transform.rotation.eulerAngles.y;
        // guardianPosition = root.transform.rotation * pointSetCentroid(OVRManager.boundary.GetGeometry(OVRBoundary.BoundaryType.OuterBoundary)) + root.transform.position;
        // writeCalibrationFile();

        return { 'x': realCentroid.x - inputCentroid.x, 'z': realCentroid.z - inputCentroid.z, 'theta': theta }
    }

};

module.exports = Calibrator;
