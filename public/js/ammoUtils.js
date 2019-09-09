
// btTransform(matrix, velocity) * body.getWorldTransform().getBasis()
function getLinearVelocityInBodyFrame(body){
	let matrix = body.getWorldTransform().getBasis();
	let inverse_matrix = matrix.transpose();
	let velocity = body.getLinearVelocity();
	let velocityMatrix = 

}