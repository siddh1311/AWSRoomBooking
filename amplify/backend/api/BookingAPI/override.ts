// This file is used to override the REST API resources configuration
import {
	AmplifyApiRestResourceStackTemplate,
	AmplifyProjectInfo,
} from "@aws-amplify/cli-extensibility-helper";

export function override(
	resources: AmplifyApiRestResourceStackTemplate,
	amplifyProjectInfo: AmplifyProjectInfo
) {
	const { paths } = resources.restApi.body;
	Object.keys(paths).forEach((path) => {
		if (path.includes("{proxy+}")) {
			delete paths[path];
		}
	});
}
